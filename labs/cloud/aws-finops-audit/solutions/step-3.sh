#!/usr/bin/env bash
aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' --output text > rds_instances.txt
aws dynamodb list-tables --query 'TableNames[*]' --output text > dynamodb_tables.txt
