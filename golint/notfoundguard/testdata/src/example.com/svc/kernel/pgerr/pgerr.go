package pgerr

func IsNotFound(err error) bool { return err != nil }
