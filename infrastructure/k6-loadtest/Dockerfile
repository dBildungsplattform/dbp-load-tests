# Create image for running k6 with output for Prometheus
FROM grafana/k6:0.43.1
USER root

RUN apk-get update && \
    apk-get upgrade -y && \
    apk-get add -y git

COPY wrapper-script.sh wrapper-script.sh
RUN chmod +x wrapper-script.sh

ENTRYPOINT ["./wrapper-script.sh"]