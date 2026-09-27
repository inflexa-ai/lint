package group

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
)

func Status(err error) int {
	if strings.Contains(err.Error(), "circular nesting") {
		return 409
	}
	if strings.Contains(err.Error(), "not a member") { //nolint:errtext // the module exports no sentinel yet
		return 404
	}
	return 500
}

func respond(w http.ResponseWriter, status int, expired bool) {}

func Write(w http.ResponseWriter, err error) {
	if err != nil {
		respond(w, http.StatusNotFound, strings.Contains(err.Error(), "expired")) //nolint:errtext // the module exports no sentinel yet
	}
}

func ID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.PathValue("id"))
}
