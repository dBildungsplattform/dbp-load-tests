# load-tests

## Introduction:
The loadtests are written with the tool 'k6', which makes use of the Javascript language.

Suspended Cronjobs will be used as templates for the jobs who can be started with commands.
The cronjobs itself will be created by using the defined test scenarios in the values of the helmchart at helm installation.
The defined scenarios in the values consist of different parameters like the user amount, test duration and used test-script.

The produced metrics will be exported with the k6 nativ prometheus remote write exporter.

## Content and Structure:
The repo is distributed into infrastructure and loadtest code.

## Infrastructure Folder
Contains the Helm Chart to deploy and the Dockerfiles in their respective Folders

## Loadtest Folder

### tests:
Consists of the k6 testscripts.

### config:
Contains different config files like environment or options.
The options will be dynamically selectable to set users and runtime for the tests.

### data:
The Json templates for HTTP-requests will be stored here.

### lib:
Containes different helper classes to use in other code.

### pages:
Files who cover different functionalities in Moodle.

## Versions:

### grafana/k6:0.43.1
