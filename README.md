# load-tests

## Introduction:
The loadtests are written with the tool 'k6', which makes use of the Javascript language.

Suspended Cronjobs will be used as templates for the jobs who can be started with commands.
The cronjobs itself will be created by using the defined test scenarios in the values of the helmchart at helm installation.
The defined scenarios in the values consist of different parameters like the user amount, test duration and used test-script.

## Content and structure:

### Folder 'js':
Consists of the k6 testscripts who will be referenced in the values.yaml.

### Folder 'templates':
Content of the Helm Chart to deploy.

### yalues.yaml
Parameters for dynamic reusability of the loadtest.
Those parameters will be used in 'templates/cronjob.yaml'

## Test Requirements:
For the tests to work as expected, the test scripts need to be mounted to the pods who run the test.
Furthermore a secret needs to be mounted, which contains login informations in JSON format to be read by k6 tests scripts.