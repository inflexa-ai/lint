package mount

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"example.com/svc/handler/response"
	"example.com/svc/kernel/pgerr"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrForbidden = errors.New("forbidden")
)

type Mount struct{ ProjectID string }

type AccessModeEscalationError struct{ Mode string }

func (e *AccessModeEscalationError) Error() string { return e.Mode }

func get(id string) (*Mount, error) { return nil, nil }

func Unguarded(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		return
	}
}

func UnguardedHeader(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		w.WriteHeader(http.StatusNotFound) // want `a 404 answer must follow a check of the error kind`
	}
}

func PgerrGuard(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if pgerr.IsNotFound(err) {
			response.WriteError(w, http.StatusNotFound, "mount not found")
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "failed")
	}
}

func ChainGuard(w http.ResponseWriter, id string) {
	_, err := get(id)
	if errors.Is(err, ErrForbidden) {
		response.WriteError(w, http.StatusForbidden, "forbidden")
	} else if err != nil {
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
	}
}

func OtherError(w http.ResponseWriter, id string) {
	_, err := get(id)
	var other error
	if err != nil {
		if errors.Is(other, ErrNotFound) {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

func Accept(w http.ResponseWriter, id string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := get(id)
		if err != nil {
			switch {
			case errors.Is(err, ErrNotFound):
				response.WriteError(w, http.StatusNotFound, "invitation not found")
			case errors.Is(err, ErrForbidden):
				response.WriteError(w, http.StatusForbidden, err.Error())
			case strings.Contains(err.Error(), "expired"):
				response.WriteError(w, http.StatusGone, err.Error()) // want `a fallback 4xx answer carries the text of an unclassified error`
			default:
				response.WriteError(w, http.StatusInternalServerError, "failed")
			}
			return
		}
	}
}

func Ownership(w http.ResponseWriter, id, projectID string) {
	m, err := get(id)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "failed")
		return
	}
	if m.ProjectID != projectID {
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
}

func Fallback(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		var escalation *AccessModeEscalationError
		if errors.As(err, &escalation) {
			response.WriteError(w, http.StatusUnprocessableEntity, escalation.Error())
			return
		}
		if errors.Is(err, ErrForbidden) {
			response.WriteError(w, http.StatusForbidden, "forbidden")
			return
		}
		response.WriteError(w, http.StatusBadRequest, err.Error()) // want `a fallback 4xx answer carries the text of an unclassified error`
		return
	}
}

func FallbackDeep(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			response.WriteError(w, http.StatusForbidden, "forbidden")
			return
		}
		response.WriteError(w, http.StatusConflict, fmt.Sprintf("conflict: %v", err)) // want `a fallback 4xx answer carries the text of an unclassified error`
	}
}

func FallbackConstant(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			response.WriteError(w, http.StatusForbidden, "forbidden")
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "failed")
	}
}

func Validation(w http.ResponseWriter, s string) {
	_, err := get(s)
	if err != nil {
		response.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid id: %s", err))
		return
	}
}

func SwitchTest(w http.ResponseWriter, id string) {
	_, err := get(id)
	switch {
	case err != nil:
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
	}
}

func method(m string) {}

func StringConstant(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		method(http.MethodPost)
	}
}

func JoinedGuard(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil && errors.Is(err, ErrNotFound) {
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
}

func ElseOfGuard(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		if errors.Is(err, ErrForbidden) {
			response.WriteError(w, http.StatusForbidden, "forbidden")
		} else {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

var notFoundText = http.StatusText(http.StatusNotFound)

func ElseOfErrorTest(w http.ResponseWriter, id string) {
	m, err := get(id)
	if err != nil {
		response.WriteError(w, http.StatusInternalServerError, "failed")
	} else if m == nil {
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
}

func NilError(w http.ResponseWriter, id string) {
	m, err := get(id)
	if err == nil && m == nil {
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
}

func ElseOfNilTest(w http.ResponseWriter, id string) {
	if _, err := get(id); err == nil {
		return
	} else {
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
	}
}

func NegatedGuard(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		if !errors.Is(err, ErrNotFound) {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
		if errors.Is(err, ErrNotFound) == false {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
		if !!errors.Is(err, ErrNotFound) || errors.Is(err, ErrForbidden) {
			response.WriteError(w, http.StatusNotFound, "mount not found")
		}
	}
}

func Alternatives(w http.ResponseWriter, id string, permitted bool) {
	if _, err := get(id); err != nil {
		if errors.Is(err, ErrNotFound) || permitted {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
		if errors.Is(err, ErrNotFound) || errors.Is(err, ErrForbidden) {
			response.WriteError(w, http.StatusNotFound, "mount not found")
		}
		if !(!errors.Is(err, ErrNotFound) && permitted) {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
		if !(!errors.Is(err, ErrNotFound) || permitted) {
			response.WriteError(w, http.StatusNotFound, "mount not found")
		}
		switch {
		case errors.Is(err, ErrNotFound), permitted:
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		case errors.Is(err, ErrNotFound), errors.As(err, new(*AccessModeEscalationError)):
			response.WriteError(w, http.StatusNotFound, "mount not found")
		}
	}
}

func ElseOfNegatedGuard(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		if !errors.Is(err, ErrNotFound) {
			response.WriteError(w, http.StatusInternalServerError, "failed")
		} else {
			response.WriteError(w, http.StatusNotFound, "mount not found")
		}
	}
}

func NegatedClassification(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		var escalation *AccessModeEscalationError
		if !errors.As(err, &escalation) {
			response.WriteError(w, http.StatusBadRequest, err.Error()) // want `a fallback 4xx answer carries the text of an unclassified error`
			return
		}
		response.WriteError(w, http.StatusUnprocessableEntity, escalation.Error())
	}
}

func CompoundNilTests(w http.ResponseWriter, id string) {
	m, err := get(id)
	if err == nil && m != nil {
		return
	} else {
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
	if err != nil || m == nil {
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
	switch {
	case err != nil, m == nil:
		response.WriteError(w, http.StatusNotFound, "mount not found")
	}
	if err != nil && !errors.Is(err, ErrNotFound) {
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
	}
	if !(err == nil) {
		response.WriteError(w, http.StatusNotFound, "x") // want `a 404 answer must follow a check of the error kind`
	}
}

func headers(w http.ResponseWriter, codes ...int) {}

func NotFoundBeside5xx(w http.ResponseWriter, id string) {
	if _, err := get(id); err != nil {
		headers(w, http.StatusNotFound, http.StatusInternalServerError) // want `a 404 answer must follow a check of the error kind`
	}
}

func NoErrorTest(w http.ResponseWriter) {
	response.WriteError(w, http.StatusNotFound, "no route")
}

type holder struct{ err error }

func SelectorGuard(w http.ResponseWriter, h holder) {
	if h.err != nil {
		if errors.Is(h.err, ErrNotFound) {
			response.WriteError(w, http.StatusNotFound, "mount not found")
		}
	}
}

func ShadowedSelector(w http.ResponseWriter, h, other holder) {
	if h.err != nil {
		h := other
		if errors.Is(h.err, ErrNotFound) {
			response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

type result struct{}

func (result) Err() error { return nil }

func CallAndIndexTests(w http.ResponseWriter, r result, errs []error, i int) {
	if r.Err() != nil {
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
	}
	if errs[i] != nil {
		response.WriteError(w, http.StatusNotFound, "mount not found") // want `a 404 answer must follow a check of the error kind`
	}
}

type NotFoundError struct{}

func (*NotFoundError) Error() string { return "not found" }

func lookup(err error) (string, bool) { return "", false }

func AsTypeInit(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if _, ok := errors.AsType[*NotFoundError](err); ok {
			response.WriteError(w, http.StatusNotFound, "not found")
			return
		}
		response.WriteError(w, http.StatusInternalServerError, "failed")
	}
}

func AsTypeInitNegated(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if _, ok := errors.AsType[*NotFoundError](err); !ok {
			response.WriteError(w, http.StatusNotFound, "not found") // want `a 404 answer must follow a check of the error kind`
		} else {
			response.WriteError(w, http.StatusNotFound, "not found")
		}
	}
}

func IsInit(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if ok := errors.Is(err, ErrNotFound); ok {
			response.WriteError(w, http.StatusNotFound, "not found")
		}
	}
}

func InitNotGuard(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if _, ok := lookup(err); ok {
			response.WriteError(w, http.StatusNotFound, "not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

func InitGuardOfOtherError(w http.ResponseWriter, id string) {
	_, err := get(id)
	var other error
	if err != nil {
		if _, ok := errors.AsType[*NotFoundError](other); ok {
			response.WriteError(w, http.StatusNotFound, "not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

func AsTypeFallback(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		if escalation, ok := errors.AsType[*AccessModeEscalationError](err); ok {
			response.WriteError(w, http.StatusUnprocessableEntity, escalation.Error())
			return
		}
		response.WriteError(w, http.StatusBadRequest, err.Error()) // want `a fallback 4xx answer carries the text of an unclassified error`
	}
}

func SwitchInitGuard(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		switch _, ok := errors.AsType[*NotFoundError](err); {
		case ok:
			response.WriteError(w, http.StatusNotFound, "not found")
		default:
			response.WriteError(w, http.StatusInternalServerError, "failed")
		}
	}
}

func SwitchInitNotGuard(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		switch _, ok := lookup(err); {
		case ok:
			response.WriteError(w, http.StatusNotFound, "not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

func SwitchInitTag(w http.ResponseWriter, id string, flag bool) {
	_, err := get(id)
	if err != nil {
		switch _, ok := errors.AsType[*NotFoundError](err); flag {
		case ok:
			response.WriteError(w, http.StatusNotFound, "not found") // want `a 404 answer must follow a check of the error kind`
		}
	}
}

func SwitchInitFallback(w http.ResponseWriter, id string) {
	_, err := get(id)
	if err != nil {
		switch escalation, ok := errors.AsType[*AccessModeEscalationError](err); {
		case ok:
			response.WriteError(w, http.StatusUnprocessableEntity, escalation.Error())
			return
		}
		response.WriteError(w, http.StatusBadRequest, err.Error()) // want `a fallback 4xx answer carries the text of an unclassified error`
	}
}
