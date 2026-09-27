package conc

func Spawn(f func()) {
	go f()
}
