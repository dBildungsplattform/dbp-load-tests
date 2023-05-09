# Multi-stage build to generate custom k6 with extension
FROM golang:1.20-alpine as builder
WORKDIR $GOPATH/src/go.k6.io/k6
COPY . .
RUN apk --no-cache add git=~2
RUN CGO_ENABLED=0 go install go.k6.io/xk6/cmd/xk6@v0.9.0  \
    && CGO_ENABLED=0 xk6 build \
    --with github.com/szkiba/xk6-prometheus@v0.1.5 \
    --output /tmp/k6

# Create image for running k6 with output for Prometheus
FROM grafana/k6:0.43.1
USER root

RUN apk update && apk add --no-cache chromium
ENV K6_BROWSER_ENABLED=true

COPY --from=builder /tmp/k6 /k6-prometheus
COPY wrapper-script.sh wrapper-script.sh
#WORKDIR /home/k6

CMD ./wrapper-script.sh