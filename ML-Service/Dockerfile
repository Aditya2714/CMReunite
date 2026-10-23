FROM python:3.13-slim AS dependencies
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --only-binary=:all: --target=/packages -r requirements.txt

# Wolfi supplies a patched glibc runtime compatible with the scientific wheels.
# Keep package metadata intact so vulnerability scanners can inspect the OS.
FROM cgr.dev/chainguard/wolfi-base:latest
RUN apk upgrade --no-cache && apk add --no-cache python-3.13 libstdc++ libgomp && ln -sf /usr/bin/python3.13 /usr/bin/python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/opt/python
WORKDIR /app
COPY --from=dependencies /packages /opt/python
COPY --chown=65532:65532 . .
USER 65532:65532
EXPOSE 5001
CMD ["python3.13", "-m", "gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "60", "app:app"]
