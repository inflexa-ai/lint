package acme

import "github.com/google/uuid"

type Grant struct {
	RevokedByUserID *uuid.UUID // want `RevokedByUserID is a uuid.UUID, but ids.UserID exists`
	OrgID           uuid.UUID  // want `OrgID is a uuid.UUID, but ids.OrgID exists`
	ResourceID      uuid.UUID
	UserName        string
	UserID          string
}

func Load(userID uuid.UUID, id uuid.UUID) (ownerUserID uuid.UUID, err error) { // want `userID is a uuid.UUID, but ids.UserID exists` `ownerUserID is a uuid.UUID, but ids.UserID exists`
	return userID, nil
}

var find = func(orgID *uuid.UUID) {} // want `orgID is a uuid.UUID, but ids.OrgID exists`

func unnamed(uuid.UUID) (uuid.UUID, error) { return uuid.UUID{}, nil }

type id = uuid.UUID

type Owner struct {
	OwnerUserID id  // want `OwnerUserID is a uuid.UUID, but ids.UserID exists`
	BackupOrgID *id // want `BackupOrgID is a uuid.UUID, but ids.OrgID exists`
}
