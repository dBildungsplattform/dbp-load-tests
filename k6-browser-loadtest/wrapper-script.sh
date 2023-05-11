#!/bin/sh

K6_PROMETHEUS_RW_SERVER_URL= servicecenter-vminsert.servicecenterlocal \
./k6 "$@"

wait -n