#!/bin/sh

git clone https://github.com/dBildungsplattform/dbp-load-tests.git
ls 
cd dbp-load-tests
ls
git checkout $BRANCH
echo "Working BRANCH"
ls

K6_PROMETHEUS_RW_SERVER_URL=http://servicecenter-vminsert.servicecenterlocal/insert/0/prometheus/ \
K6_PROMETHEUS_RW_USERNAME=$SECRET_USERNAME \
K6_PROMETHEUS_RW_PASSWORD=$SECRET_PASSWORD \
k6 "$@"