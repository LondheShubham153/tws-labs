#!/usr/bin/env bash
aws ec2 describe-addresses --query 'Addresses[*].AllocationId' --output text > idle_eips.txt
aws ec2 describe-nat-gateways --query 'NatGateways[*].NatGatewayId' --output text > nat_gateways.txt
