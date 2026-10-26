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

func NewWithNew() *http.Client {
	return new(http.Client) // want `build the HTTP client in an approved client package`
}

func Declared() {
	var c http.Client // want `build the HTTP client in an approved client package`
	var p *http.Client
	_, _ = c, p
}

type Wrapper struct {
	c *http.Client
}

func Copy(resp *http.Response, dst io.Writer) error {
	_, err := io.Copy(dst, resp.Body)
	return err
}
