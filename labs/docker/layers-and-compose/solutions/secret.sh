for l in image/blobs/sha256/*; do tar -xOf $l app/.env 2>/dev/null; done > found.txt
