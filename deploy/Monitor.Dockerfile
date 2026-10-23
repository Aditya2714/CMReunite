FROM python:3.13-alpine
RUN apk upgrade --no-cache && rm -rf /usr/local/lib/python3.13/ensurepip /usr/local/lib/python3.13/site-packages/pip* /usr/local/bin/pip*
RUN adduser -D -u 10001 monitor && mkdir /state && chown monitor:monitor /state
COPY deploy/monitor.py /monitor.py
USER monitor
CMD ["python", "/monitor.py"]
