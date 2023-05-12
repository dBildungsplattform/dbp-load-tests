#!/bin/sh

K6_PROMETHEUS_RW_SERVER_URL=http://servicecenter-vminsert.servicecenterlocal/insert/0/prometheus/ \
K6_PROMETHEUS_RW_USERNAME=$SECRET_USERNAME \
K6_PROMETHEUS_RW_PASSWORD=$SECRET_PASSWORD \
k6 "$@"
