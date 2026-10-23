FROM cgr.dev/chainguard/wolfi-base:latest

RUN apk upgrade --no-cache \
    && apk add --no-cache restic ca-certificates

ENTRYPOINT ["/usr/bin/restic"]
