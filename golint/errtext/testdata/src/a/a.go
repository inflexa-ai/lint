package a

import (
	"errors"
	"log/slog"
	"strings"
)

var ErrExists = errors.New("exists")

type codeError struct{ code string }

func (e *codeError) Error() string { return e.code }

func status(err error, ce *codeError) int {
	if strings.Contains(err.Error(), "circular nesting") { // want `the condition reads the text of an error`
		return 1
	}
	if strings.HasPrefix(err.Error(), "x") || strings.HasSuffix(err.Error(), "y") { // want `the condition reads the text of an error` `the condition reads the text of an error`
		return 2
	}
	if strings.EqualFold(err.Error(), "z") { // want `the condition reads the text of an error`
		return 3
	}
	if err.Error() == "exists" || "gone" != (err.Error()) { // want `the condition reads the text of an error` `the condition reads the text of an error`
		return 4
	}
	switch err.Error() { // want `the condition reads the text of an error`
	case "a":
		return 5
	}
	switch "b" {
	case err.Error(): // want `the condition reads the text of an error`
		return 6
	}
	if ce.Error() == "E1" {
		return 7
	}
	if errors.Is(err, ErrExists) {
		return 8
	}
	slog.Error("failed", "error", err.Error())
	msg := err.Error()
	_ = strings.ToUpper(err.Error())
	return len(msg)
}
