# Local Docker Stack

`make dev` starts Postgres, Redis, NATS JetStream, MinIO, the API, worker, extension runtime, and web shell.

Run migrations with `make migrate-up DATABASE_URL=postgres://hugeedge:hugeedge@localhost:5432/hugeedge?sslmode=disable` after installing `golang-migrate`.
