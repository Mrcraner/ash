package auth

import (
	"crypto/rand"
	"fmt"
	"time"

	"github.com/oklog/ulid/v2"
)

// NewULID returns a new ULID string (26 chars, Crockford base32).
func NewULID() (string, error) {
	id, err := ulid.New(ulid.Timestamp(time.Now().UTC()), rand.Reader)
	if err != nil {
		return "", fmt.Errorf("ulid: %w", err)
	}
	return id.String(), nil
}
