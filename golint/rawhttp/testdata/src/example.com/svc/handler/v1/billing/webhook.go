package billing

import (
	"encoding/json"
	"io"
	"net/http"
)

func Webhook(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body) // want `read the request body through the approved body package`
	var v map[string]string
	_ = json.NewDecoder(r.Body).Decode(&v) // want `read the request body through the approved body package`
	_ = body
}

type request = http.Request

func AliasedBody(r *request) {
	_, _ = io.ReadAll(r.Body) // want `read the request body through the approved body package`
}

func Limited(w http.ResponseWriter, r *http.Request) {
	_, _ = io.ReadAll(io.LimitReader(r.Body, 1<<20)) // want `read the request body through the approved body package`
}

func Assigned(r *http.Request) io.Reader {
	body := r.Body // want `read the request body through the approved body package`
	return body
}

func Copied(dst io.Writer, r *http.Request) {
	_, _ = io.Copy(dst, r.Body) // want `read the request body through the approved body package`
}

func Read(r *http.Request, buf []byte) {
	_, _ = r.Body.Read(buf) // want `read the request body through the approved body package`
}

func LeftAlone(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()
	if r.Body == nil || nil != r.Body {
		return
	}
}
