package service

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Mrcraner/ash/backend/pkg/auth"
	"github.com/Mrcraner/ash/backend/pkg/config"
	"github.com/Mrcraner/ash/backend/services/user/internal/model"
	"gorm.io/gorm"
)

var (
	ErrUsernameTaken      = errors.New("用户名已被使用")
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrUserDisabled       = errors.New("账号已被禁用")
	ErrSessionInvalid     = errors.New("登录状态无效")
	ErrValidation         = errors.New("参数校验失败")
)

type AuthService struct {
	db  *gorm.DB
	cfg config.AuthConfig
}

func NewAuthService(db *gorm.DB, cfg config.AuthConfig) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

func (s *AuthService) sessionTTL() time.Duration {
	days := s.cfg.SessionTTLDays
	if days <= 0 {
		days = 365
	}
	return time.Duration(days) * 24 * time.Hour
}

func (s *AuthService) lastSeenInterval() time.Duration {
	sec := s.cfg.LastSeenMinIntervalSec
	if sec <= 0 {
		sec = 300
	}
	return time.Duration(sec) * time.Second
}

type PublicUser struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Nickname  string    `json:"nickname"`
	CreatedAt time.Time `json:"created_at"`
}

func toPublic(u *model.User) PublicUser {
	return PublicUser{
		ID:        u.ID,
		Username:  u.Username,
		Nickname:  u.Nickname,
		CreatedAt: u.CreatedAt,
	}
}

type RegisterInput struct {
	Nickname        string
	Username        string
	Password        string
	ConfirmPassword string
	UserAgent       string
	ClientIP        string
}

type LoginInput struct {
	Username  string
	Password  string
	UserAgent string
	ClientIP  string
}

type SessionResult struct {
	User      PublicUser
	Token     string
	SessionID string
	ExpiresAt time.Time
}

func validateUsernameNickname(username, nickname string) error {
	uLen := utf8.RuneCountInString(username)
	nLen := utf8.RuneCountInString(nickname)
	if uLen < 1 || uLen > 32 {
		return fmt.Errorf("%w：用户名长度必须为 1–32 个字符", ErrValidation)
	}
	if nLen < 1 || nLen > 32 {
		return fmt.Errorf("%w：昵称长度必须为 1–32 个字符", ErrValidation)
	}
	if strings.TrimSpace(username) != username || username == "" {
		return fmt.Errorf("%w：用户名首尾不能包含空格", ErrValidation)
	}
	if strings.TrimSpace(nickname) != nickname || nickname == "" {
		return fmt.Errorf("%w：昵称首尾不能包含空格", ErrValidation)
	}
	return nil
}

func (s *AuthService) Register(in RegisterInput) (*SessionResult, error) {
	if err := validateUsernameNickname(in.Username, in.Nickname); err != nil {
		return nil, err
	}
	if in.Password != in.ConfirmPassword {
		return nil, fmt.Errorf("%w：两次输入的密码不一致", ErrValidation)
	}
	if err := auth.ValidatePasswordRules(in.Password); err != nil {
		return nil, fmt.Errorf("%w：%s", ErrValidation, err.Error())
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}
	uid, err := auth.NewULID()
	if err != nil {
		return nil, err
	}

	user := &model.User{
		ID:           uid,
		Username:     in.Username,
		Nickname:     in.Nickname,
		PasswordHash: hash,
		Status:       model.UserStatusActive,
	}

	var result *SessionResult
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			if isDuplicateKey(err) {
				return ErrUsernameTaken
			}
			return err
		}
		sess, err := s.createExclusiveSession(tx, user.ID, in.UserAgent, in.ClientIP)
		if err != nil {
			return err
		}
		result = sess
		result.User = toPublic(user)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *AuthService) Login(in LoginInput) (*SessionResult, error) {
	if utf8.RuneCountInString(in.Username) < 1 || in.Password == "" {
		return nil, ErrInvalidCredentials
	}

	var user model.User
	if err := s.db.Where("username = ?", in.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if user.Status != model.UserStatusActive {
		return nil, ErrUserDisabled
	}
	ok, err := auth.CheckPassword(user.PasswordHash, in.Password)
	if err != nil || !ok {
		return nil, ErrInvalidCredentials
	}

	var result *SessionResult
	err = s.db.Transaction(func(tx *gorm.DB) error {
		sess, err := s.createExclusiveSession(tx, user.ID, in.UserAgent, in.ClientIP)
		if err != nil {
			return err
		}
		result = sess
		result.User = toPublic(&user)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *AuthService) createExclusiveSession(tx *gorm.DB, userID, userAgent, clientIP string) (*SessionResult, error) {
	now := time.Now().UTC()
	if err := tx.Model(&model.Session{}).
		Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userID, now).
		Update("revoked_at", now).Error; err != nil {
		return nil, err
	}

	token, err := auth.NewSessionToken()
	if err != nil {
		return nil, err
	}
	sid, err := auth.NewULID()
	if err != nil {
		return nil, err
	}
	expires := now.Add(s.sessionTTL())
	sess := &model.Session{
		ID:          sid,
		UserID:      userID,
		TokenHash:   auth.HashToken(token),
		Fingerprint: auth.Fingerprint(userAgent, clientIP),
		ExpiresAt:   expires,
		LastSeenAt:  now,
	}
	if err := tx.Create(sess).Error; err != nil {
		return nil, err
	}
	return &SessionResult{
		Token:     token,
		SessionID: sid,
		ExpiresAt: expires,
	}, nil
}

func (s *AuthService) Logout(token string) error {
	if token == "" {
		return nil
	}
	now := time.Now().UTC()
	return s.db.Model(&model.Session{}).
		Where("token_hash = ? AND revoked_at IS NULL", auth.HashToken(token)).
		Update("revoked_at", now).Error
}

func (s *AuthService) Me(userID string) (*PublicUser, error) {
	var user model.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	if user.Status != model.UserStatusActive {
		return nil, ErrUserDisabled
	}
	pub := toPublic(&user)
	return &pub, nil
}

// ValidateSession implements middleware.SessionValidator.
func (s *AuthService) ValidateSession(token, userAgent, clientIP string) (userID, sessionID string, err error) {
	if token == "" {
		return "", "", ErrSessionInvalid
	}
	now := time.Now().UTC()
	var sess model.Session
	if err := s.db.Where("token_hash = ?", auth.HashToken(token)).First(&sess).Error; err != nil {
		return "", "", ErrSessionInvalid
	}
	if sess.RevokedAt != nil || sess.ExpiresAt.Before(now) {
		return "", "", ErrSessionInvalid
	}

	fp := auth.Fingerprint(userAgent, clientIP)
	if subtleConstantTimeEq(sess.Fingerprint, fp) == false {
		// Same cookie used from a different device fingerprint → revoke.
		_ = s.db.Model(&model.Session{}).Where("id = ?", sess.ID).Update("revoked_at", now).Error
		return "", "", ErrSessionInvalid
	}

	var user model.User
	if err := s.db.Select("id", "status").Where("id = ?", sess.UserID).First(&user).Error; err != nil {
		return "", "", ErrSessionInvalid
	}
	if user.Status != model.UserStatusActive {
		_ = s.db.Model(&model.Session{}).Where("id = ?", sess.ID).Update("revoked_at", now).Error
		return "", "", ErrSessionInvalid
	}

	if now.Sub(sess.LastSeenAt) >= s.lastSeenInterval() {
		_ = s.db.Model(&model.Session{}).Where("id = ?", sess.ID).Update("last_seen_at", now).Error
	}
	return sess.UserID, sess.ID, nil
}

func subtleConstantTimeEq(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var v byte
	for i := 0; i < len(a); i++ {
		v |= a[i] ^ b[i]
	}
	return v == 0
}

func isDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") || strings.Contains(msg, "unique")
}
