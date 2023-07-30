# Create image for running k6 with output for Prometheus
FROM grafana/k6:0.43.1
USER root

COPY wrapper-script.sh wrapper-script.sh

#for Browser testing required
ENV K6_BROWSER_ENABLED=true

RUN echo "https://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
    apk update && apk upgrade

RUN apk add --no-cache chromium && \
    chmod +x wrapper-script.sh

ENTRYPOINT ["./wrapper-script.sh"]
