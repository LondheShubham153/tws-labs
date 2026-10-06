. "$LAB_LIB"
[ -f layers.txt ] || fail "layers.txt does not exist yet."
man=$(jq -r '.manifests[0].digest' image/index.json 2>/dev/null | sed 's/^sha256://')
want=$(jq '.layers | length' "image/blobs/sha256/$man" 2>/dev/null)
[ -n "$want" ] || fail "Could not read the image manifest."
[ "$(tr -d '[:space:]' < layers.txt)" = "$want" ] || fail "layers.txt does not match the number of layers in the manifest."
