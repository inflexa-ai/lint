package acme

import (
	"io"
	"net/http"
	"time"
)

func New(t time.Duration) *http.Client {
	return &http.Client{Timeout: t} // want `build the HTTP client in an approved client package`
}

func Plain() http.Client {
	return http.Client{} // want `build the HTTP client in an approved client package`
}

func Read(resp *http.Response) ([]byte, error) {
	return io.ReadAll(resp.Body)
}

type client = http.Client

type request = http.Request

func Aliased() *client {
	return &client{} // want `build the HTTP client in an approved client package`
}

func ReadAliased(r *request) ([]byte, error) {
	return io.ReadAll(r.Body) // want `read the request body through the approved body package`
}
