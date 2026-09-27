package v1

import (
	"net/http"

	"example.com/svc/handler/probe"
)

type Group struct{}

func (g *Group) HandleGET(path string, fn http.HandlerFunc)  {}
func (g *Group) HandlePOST(path string, fn http.HandlerFunc) {}
func (g *Group) Other(path string, fn http.HandlerFunc)      {}

// InfoHandler returns build information.
//
//	@Success	200
//	@Router		/info [get]
func InfoHandler(w http.ResponseWriter, r *http.Request) {} // want InfoHandler:"routeDoc"

func undocumented(w http.ResponseWriter, r *http.Request) {}

func Routes(g *Group) {
	g.HandleGET("/health", probe.HealthHandler) // want `the route has no Swagger annotations: add a doc comment with @Router to probe.HealthHandler`
	g.HandleGET("/ready", probe.ReadyHandler)
	g.HandlePOST("/things", probe.CreateHandler("dep"))
	g.HandleGET("/info", InfoHandler)
	g.HandleGET("/undocumented", undocumented) // want `the route has no Swagger annotations: add a doc comment with @Router to undocumented`
	g.Other("/other", undocumented)
	g.HandleGET("/inline", func(w http.ResponseWriter, r *http.Request) {})
}

type RouteFields struct {
	HandleGET func(path string, fn http.HandlerFunc)
}

func FieldNamedLikeRegister(m RouteFields) {
	m.HandleGET("/field", undocumented)
}
