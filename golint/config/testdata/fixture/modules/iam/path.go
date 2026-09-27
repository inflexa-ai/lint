package iam

import (
	"net/http"

	"github.com/google/uuid"
)

func PathID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.PathValue("id"))
}
