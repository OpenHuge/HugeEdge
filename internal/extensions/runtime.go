package extensions

import (
	"context"
	"time"
)

type Runtime struct {
	Target    string
	Isolation string
}

func NewRuntime(target string, isolation string) Runtime {
	return Runtime{Target: target, Isolation: isolation}
}

func (r Runtime) Run(ctx context.Context) {
	<-ctx.Done()
	time.Sleep(10 * time.Millisecond)
}
