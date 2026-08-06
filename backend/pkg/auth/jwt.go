package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid access token")
	ErrMissingSecret = errors.New("jwt secret not configured")
)

// AccessClaims is the short-lived cross-service identity token.
type AccessClaims struct {
	UserID    string `json:"uid"`
	SessionID string `json:"sid"`
	Username  string `json:"uname,omitempty"`
	jwt.RegisteredClaims
}

func accessTTL(minutes int) time.Duration {
	if minutes <= 0 {
		minutes = 15
	}
	return time.Duration(minutes) * time.Minute
}

// IssueAccessToken signs an HS256 access JWT.
func IssueAccessToken(secret, userID, sessionID, username string, ttlMinutes int) (token string, expiresAt time.Time, err error) {
	if secret == "" {
		return "", time.Time{}, ErrMissingSecret
	}
	now := time.Now().UTC()
	expiresAt = now.Add(accessTTL(ttlMinutes))
	claims := AccessClaims{
		UserID:    userID,
		SessionID: sessionID,
		Username:  username,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token, err = t.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign jwt: %w", err)
	}
	return token, expiresAt, nil
}

// ParseAccessToken verifies an HS256 access JWT.
func ParseAccessToken(secret, token string) (*AccessClaims, error) {
	if secret == "" {
		return nil, ErrMissingSecret
	}
	if token == "" {
		return nil, ErrInvalidToken
	}
	parsed, err := jwt.ParseWithClaims(token, &AccessClaims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("%w: unexpected alg", ErrInvalidToken)
		}
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		return nil, ErrInvalidToken
	}
	claims, ok := parsed.Claims.(*AccessClaims)
	if !ok || claims.UserID == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
