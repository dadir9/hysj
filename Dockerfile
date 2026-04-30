# Stage 1: Build
FROM rust:1.94-bookworm AS builder

WORKDIR /app
COPY . .

RUN cargo build --release --bin hysj-api

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/hysj-api /usr/local/bin/hysj-api
COPY --from=builder /app/migrations /app/migrations

WORKDIR /app

ENV RUST_LOG=info

EXPOSE 8080

CMD ["hysj-api"]
