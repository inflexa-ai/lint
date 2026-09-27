package lifecycle

type Broker struct{}

func (b *Broker) run() {}

func (b *Broker) Start() {
	go b.run() // want `a goroutine with no join and no stop`
}

func (b *Broker) Stop() {}
