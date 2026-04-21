FROM mcr.microsoft.com/devcontainers/base:bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash-completion \
    build-essential \
    ca-certificates \
    curl \
    git \
    jq \
    make \
    pkg-config \
    postgresql-client \
    redis-tools \
    ripgrep \
    unzip \
    zip \
  && rm -rf /var/lib/apt/lists/*
