# Create image for running k6 with output for Prometheus
FROM grafana/k6:0.43.1
USER root

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git

COPY wrapper-script.sh wrapper-script.sh
RUN chmod +x wrapper-script.sh

ENTRYPOINT ["./wrapper-script.sh"]