FROM golang:1.26.10-alpine AS build

WORKDIR /build
RUN apk add --no-cache git \
    && go mod init cmrunite.local/caddy-build \
    && go get github.com/caddyserver/caddy/v2/cmd/caddy@v2.11.7 \
    && go get golang.org/x/net@v0.60.0 \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/caddy github.com/caddyserver/caddy/v2/cmd/caddy

FROM cgr.dev/chainguard/wolfi-base:latest

RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates \
    && mkdir -p /data/caddy /config/caddy \
    && chown -R 65532:65532 /data /config

COPY --from=build /out/caddy /usr/bin/caddy
ENV XDG_DATA_HOME=/data
ENV XDG_CONFIG_HOME=/config
USER 65532:65532
EXPOSE 8080 8443
ENTRYPOINT ["/usr/bin/caddy"]
CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
