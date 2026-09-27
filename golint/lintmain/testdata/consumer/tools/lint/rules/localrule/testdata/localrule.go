package testdata

type client struct{}

func (c client) V1Call() {}

func use(c client) {
	c.V1Call() // want `the rule of this run flags V1Call`
}
