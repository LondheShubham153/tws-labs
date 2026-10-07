#!/usr/bin/env bash
if [ -f "unattached_ebs.txt" ] && [ -f "s3_buckets.txt" ]; then
    exit 0
else
    echo "Missing unattached_ebs.txt or s3_buckets.txt."
    exit 1
fi
