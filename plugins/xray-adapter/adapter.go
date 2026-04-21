package xrayadapter

import (
	"context"
	"encoding/json"
	"errors"

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

func (Adapter) Validate(config []byte) error {
	if failMode(config) == "validate" {
		return errors.New("xray-adapter validation failed")
	}
	return ensureJSON(config)
}

func (Adapter) Apply(config []byte) error {
	if failMode(config) == "apply" {
		return errors.New("xray-adapter apply failed")
	}
	return ensureJSON(config)
}

func (Adapter) Rollback() error {
	return nil
}

func (Adapter) HealthCheck(context.Context) error {
	return nil
}

func (Adapter) Version() string {
	return "0.1.0"
}

func ensureJSON(config []byte) error {
	if len(config) == 0 {
		return errors.New("xray-adapter config was empty")
	}
	var payload map[string]any
	return json.Unmarshal(config, &payload)
}

func failMode(config []byte) string {
	var payload map[string]any
	if err := json.Unmarshal(config, &payload); err != nil {
		return ""
	}
	mode, _ := payload["simulateFailure"].(string)
	return mode
}
