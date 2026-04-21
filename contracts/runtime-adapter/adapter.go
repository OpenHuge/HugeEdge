package runtimeadapter

import "context"

const DefaultAdapterName = "xray-adapter"

type Capability struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type Adapter interface {
	Name() string
	CompatibilityTarget() string
	Discover(ctx context.Context) ([]Capability, error)
	Validate(config []byte) error
	Apply(config []byte) error
	Rollback() error
	HealthCheck(ctx context.Context) error
	Version() string
}
