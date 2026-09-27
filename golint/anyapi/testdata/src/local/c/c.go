package c

type Setter interface {
	Set(v any) // want `v exposes any in an exported API`
}
