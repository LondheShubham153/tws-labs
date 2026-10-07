#!/usr/bin/env bash
if [ -f "active_ec2.txt" ] && [ -f "active_lambda.txt" ]; then
    exit 0
else
    echo "Missing active_ec2.txt or active_lambda.txt."
    exit 1
fi
