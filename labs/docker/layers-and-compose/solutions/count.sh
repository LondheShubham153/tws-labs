jq -r '.layers | length' image/blobs/sha256/$(jq -r '.manifests[0].digest' image/index.json | sed 's/^sha256://') > layers.txt
