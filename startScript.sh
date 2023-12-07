#!/bin/bash
helpFunction()
{
   echo ""
   echo "Usage: ./script.sh -o optionsFile.json"
   echo -e "\t-o Selection of the Option File to set virtual Users and test runtime."
   echo -e "\t-b Selection of the Branch to use after cloning(Selection of the Loadtest)."
   echo -e "Example: \n ./script -o 300s250u.json"
   exit 1 # Exit script after printing help
}


while getopts "o:b:" opt
do
   case "$opt" in
      o ) optionsParameter="$OPTARG" ;; #Which options file to use as Loadtest Parameters
      #e ) envParameter="$OPTARG" ;; # For later use to change the test environment dynamically
      b ) branch="$OPTARG" ;; #To change the branch from where to clone
      ? ) helpFunction ;; # Print helpFunction in case parameter is non-existent
   esac
done

# Print helpFunction in case parameters are empty
if [ -z "$optionsParameter" ]
then
   echo "Some or all of the parameters are empty";
   helpFunction
fi

for scenario in user-scenario; do
	job_name=loadtest-${scenario}
	template_cronjob_name=cronjob.batch/loadtest-${scenario}
	
	kubectl set env cronjob.batch/loadtest-user-scenario OPTIONS_FILE_PATH=$optionsParameter BRANCH=$branch -n loadtest --kubeconfig /home/maximilian/.kube/loadtest-sc-test-loadtestdriver.yaml
	echo "ENV changed to $optionsParameter"
	kubectl create job ${job_name} -n loadtest --kubeconfig /home/maximilian/.kube/loadtest-sc-test-loadtestdriver.yaml --from=${template_cronjob_name}
	echo "Launched job ${job_name} based on ${template_cronjob_name}"

done
