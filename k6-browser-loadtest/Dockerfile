# Create image for running k6 with output for Prometheus
FROM grafana/k6:0.43.1
USER root

#for Browser testing required
RUN apk update && apk add --no-cache chromium
ENV K6_BROWSER_ENABLED=true

#COPY wrapper-script.sh wrapper-script.sh
#RUN chmod +x wrapper-script.sh
#WORKDIR /home/k6

#ENTRYPOINT ["./wrapper-script.sh"]