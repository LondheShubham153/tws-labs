#!/usr/bin/env bash
if [ -f "rds_instances.txt" ] && [ -f "dynamodb_tables.txt" ]; then
    exit 0
else
    echo "Missing rds_instances.txt or dynamodb_tables.txt."
    exit 1
fi
