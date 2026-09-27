package response

import "net/http"

func WriteError(w http.ResponseWriter, status int, message string) {}
