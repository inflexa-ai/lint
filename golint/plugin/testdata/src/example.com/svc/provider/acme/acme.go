package acme

import "github.com/google/uuid"

type Grant struct {
	RevokedByUserID *uuid.UUID // want `RevokedByUserID is a uuid.UUID, but ids.UserID exists`
	GrantID         uuid.UUID
	OrgID           uuid.UUID
}
