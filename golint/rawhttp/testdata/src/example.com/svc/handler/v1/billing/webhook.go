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
