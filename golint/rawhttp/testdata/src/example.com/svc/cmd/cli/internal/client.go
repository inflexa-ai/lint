package internal

import (
	"net/http"
	"time"
)

func New(t time.Duration) *http.Client {
	return &http.Client{Timeout: t}
}
