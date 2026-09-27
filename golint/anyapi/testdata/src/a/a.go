package a

import "context"

type JSONMap map[string]any

type Notification struct {
	Conditions map[string]any // want `Conditions exposes map\[string\]any in an exported API`
	Payload    any            // want `Payload exposes any in an exported API`
	Metadata   JSONMap
	Tags       map[string]string
	internal   map[string]any
}

type hidden struct {
	Conditions map[string]any
}

func Build(input map[string]any, n int) (any, error) { // want `input exposes map\[string\]any in an exported API` `Build exposes any in an exported API`
	return nil, nil
}

func Log(msg string, args ...any) {}

func LogMaps(msg string, args ...map[string]any) {} // want `args exposes map\[string\]any in an exported API`

func build(input map[string]any) any { return nil }

func Generic[T any](v T) T { return v }

type Value struct{}

func (v *Value) Scan(src any) error { return nil }

func (v *Value) Set(x interface{}) {} // want `x exposes any in an exported API`

func (h *hidden) Set(x any) {}

func (v *Value) set(x any) {}

type Decoder interface {
	Decode(any) error       // want `Decode exposes any in an exported API`
	Fields() map[string]any // want `Fields exposes map\[string\]any in an exported API`
	Logf(format string, args ...any)
	Scan(src any) error
	io
}

type io interface {
	Read(v any) error // want `v exposes any in an exported API`
}

type hiddenDecoder interface {
	Decode(any) error
}

type TxContext interface {
	context.Context
	Tx() string
}
