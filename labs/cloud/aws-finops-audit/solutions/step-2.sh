#!/usr/bin/env bash
aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[*].VolumeId' --output text > unattached_ebs.txt
aws s3api list-buckets --query 'Buckets[*].Name' --output text > s3_buckets.txt
