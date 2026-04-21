package platform

import "os"

type Config struct {
	HTTPAddr    string
	DatabaseURL string
	RedisAddr   string
	NATSURL     string
	JWTSecret   string
}

func LoadConfig() Config {
	return Config{
		HTTPAddr:    getenv("HUGEEDGE_HTTP_ADDR", ":8080"),
		DatabaseURL: getenv("DATABASE_URL", "postgres://hugeedge:hugeedge@localhost:5432/hugeedge?sslmode=disable"),
		RedisAddr:   getenv("REDIS_ADDR", "localhost:6379"),
		NATSURL:     getenv("NATS_URL", "nats://localhost:4222"),
		JWTSecret:   getenv("JWT_SECRET", "local-dev-secret"),
	}
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
