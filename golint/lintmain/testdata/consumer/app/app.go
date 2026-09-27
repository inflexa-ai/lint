package app

type client struct{}

func (c client) V1Call() {}

func (c client) V2Call() {}

func Use(c client) {
	c.V1Call()
	c.V2Call()
	c.V1Call() //nolint:localrule // the call is correct here
}
