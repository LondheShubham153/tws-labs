#!/usr/bin/env bash
if [ -f "idle_eips.txt" ] && [ -f "nat_gateways.txt" ]; then
    exit 0
else
    echo "Missing idle_eips.txt or nat_gateways.txt."
    exit 1
fi
