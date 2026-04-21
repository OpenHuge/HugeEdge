package xrayadapter

import (
	"context"

	runtimeadapter "github.com/hugeedge/hugeedge/contracts/runtime-adapter"
)

type Adapter struct{}

func (Adapter) Name() string {
	return runtimeadapter.DefaultAdapterName
}

func (Adapter) CompatibilityTarget() string {
	return runtimeadapter.DefaultAdapterName
}

func (Adapter) Discover(context.Context) ([]runtimeadapter.Capability, error) {
	return []runtimeadapter.Capability{{Name: "adapter.xray", Version: "0.1.0"}}, nil
}
