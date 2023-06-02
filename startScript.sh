#!/bin/bash
#Requires a specific options File name to use as launch option
for scenario in user-scenario; do
	job_name=loadtest-${scenario}
	template_cronjob_name=cronjob.batch/loadtest-${scenario}
	
	kubectl set env cronjob.batch/loadtest-user-scenario OPTIONS_FILE_PATH=$1 -n loadtest --kubeconfig /home/maximilian/.kube/loadtest-sc-test-loadtestdriver.yaml
	echo "ENV changed to $1"
	kubectl create job ${job_name} -n loadtest --kubeconfig /home/maximilian/.kube/loadtest-sc-test-loadtestdriver.yaml --from=${template_cronjob_name}
	echo "Launched job ${job_name} based on ${template_cronjob_name}"

done
