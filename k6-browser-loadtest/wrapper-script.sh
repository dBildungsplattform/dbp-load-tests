#!/bin/bash
  
# Start the primary process and put it in the background
./k6-prometheus &

wait -n