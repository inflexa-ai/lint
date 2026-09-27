package noguards

import (
	"net/http"

	"example.com/svc/handler/response"
	"example.com/svc/kernel/pgerr"
)

func get(id string) error { return nil }

func PgerrGuard(w http.ResponseWriter, id string) {
	if err := get(id); err != nil {
		if pgerr.IsNotFound(err) {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}
