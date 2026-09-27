package probe

import "net/http"

func write(w http.ResponseWriter, status int, msg string) {}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	write(w, http.StatusConflict, "no annotations, thus no status report")
}

// ReadyHandler answers the readiness probe.
//
//	@Summary	Readiness
//	@Success	200
//	@Failure	503
//	@Router		/ready [get]
func ReadyHandler(w http.ResponseWriter, r *http.Request) { // want ReadyHandler:"routeDoc"
	write(w, http.StatusOK, "ok")
}

// CreateHandler creates a thing.
//
//	@Failure	400	{object}	ErrorResponse
//	@Failure	403,404	{object}	ErrorResponse
//	@Router		/things [post]
func CreateHandler(dep string) http.HandlerFunc { // want CreateHandler:"routeDoc"
	return func(w http.ResponseWriter, r *http.Request) {
		write(w, http.StatusBadRequest, http.MethodPost)
		write(w, http.StatusNotFound, "missing")
		write(w, http.StatusConflict, "exists") // want `CreateHandler writes 409, but no @Success or @Failure line lists it`
		write(w, http.StatusInternalServerError, "failed")
		w.WriteHeader(http.StatusTooManyRequests) // want `CreateHandler writes 429, but no @Success or @Failure line lists it`
	}
}
