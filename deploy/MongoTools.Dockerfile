FROM cgr.dev/chainguard/wolfi-base:latest

RUN apk upgrade --no-cache \
    && apk add --no-cache mongo-tools ca-certificates

ENTRYPOINT []
