package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

// NewSessionToken returns a high-entropy opaque token suitable for cookies.
func NewSessionToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("rand: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// HashToken SHA-256 hex-encodes a session token for storage.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Fingerprint builds a device hint from User-Agent.
// IP is intentionally excluded so NAT/mobile IP churn does not kill year-long sessions;
// cookie reuse on a different UA still triggers revocation.
func Fingerprint(userAgent, _ string) string {
	sum := sha256.Sum256([]byte(userAgent))
	return hex.EncodeToString(sum[:])
}
