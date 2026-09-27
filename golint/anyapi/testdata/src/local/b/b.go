package b

import (
	"io"

	"local/c"
)

type Source interface {
	io.Reader
	c.Setter // want `v exposes any in an exported API`
}
