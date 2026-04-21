package workflows

import "context"

type Runner struct{}

func NewRunner() Runner {
	return Runner{}
}

func (Runner) Run(ctx context.Context) {
	<-ctx.Done()
}
