#!/bin/sh

git clone https://github.com/dBildungsplattform/dbp-load-tests.git
#cd dbp-load-tests
cd ..
echo "One up"
ls
cd ..
echo "Two up"
ls
cd ..
echo "Three up"
ls
#git checkout $BRANCH
#echo "Working BRANCH"


K6_PROMETHEUS_RW_SERVER_URL=http://servicecenter-vminsert.servicecenterlocal/insert/0/prometheus/ \
K6_PROMETHEUS_RW_USERNAME=$SECRET_USERNAME \
K6_PROMETHEUS_RW_PASSWORD=$SECRET_PASSWORD \
k6 "$@"