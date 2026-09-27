package iam

import "testing"

func exec(n int, q string) {}

const truncateAll = `TRUNCATE iam_orgs CASCADE`

func TestReset(t *testing.T) {
	exec(1, `TRUNCATE iam_users CASCADE`)
	exec(2, truncateAll)
	const grants = `TRUNCATE iam_grants`
	var members = `TRUNCATE iam_members`
	exec(3, grants+members+resetQuery())
}

func resetQuery() string {
	return `TRUNCATE iam_roles`
}
