package fleet

type RuntimeAdapter interface {
	Name() string
	CompatibilityTarget() string
}

type CommandPoller interface {
	Poll() ([]Command, error)
}

type Command struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
}
