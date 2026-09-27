package cache

import "example.com/fixture/modules/iam"

func Key(id string) string { return iam.Prefix + id }
