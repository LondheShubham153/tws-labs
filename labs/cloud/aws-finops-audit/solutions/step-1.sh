#!/usr/bin/env bash
aws ec2 describe-instances --query 'Reservations[*].Instances[*].InstanceId' --output text > active_ec2.txt
aws lambda list-functions --query 'Functions[*].FunctionName' --output text > active_lambda.txt
