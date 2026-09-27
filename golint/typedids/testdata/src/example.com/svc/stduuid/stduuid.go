package stduuid

import "uuid"

type Ref struct {
	UserID     uuid.UUID  // want `UserID is a uuid.UUID, but ids.UserID exists`
	OrgID      *uuid.UUID // want `OrgID is a uuid.UUID, but ids.OrgID exists`
	ResourceID uuid.UUID
}
