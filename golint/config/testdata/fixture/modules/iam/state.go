package iam

import "errors"

type State int

const (
	Active State = iota
	Revoked
)

type Kind string

const (
	User  Kind = "user"
	Robot Kind = "robot"
)

func Label(s State) string {
	switch s {
	case Active:
		return "active"
	default:
	}
	return ""
}

func Check(k Kind) error {
	switch k := k; k {
	case User:
		return nil
	default:
		break
	}
	return nil
}

func Guard(s State) error {
	switch s {
	case Active, Revoked:
		return nil
	default:
		return errors.New("unknown state")
	}
}

func Count(n int) string {
	switch n {
	case 1:
		return "one"
	default:
	}
	return ""
}
