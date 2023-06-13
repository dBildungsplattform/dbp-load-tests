# Create image for running k6 with output for Prometheus
FROM grafana/k6:0.43.1
USER root

COPY wrapper-script.sh wrapper-script.sh

#for Browser testing required
ENV K6_BROWSER_ENABLED=true

RUN apk update && apk add --no-cache chromium && \
    chmod +x wrapper-script.sh

ENTRYPOINT ["./wrapper-script.sh"]