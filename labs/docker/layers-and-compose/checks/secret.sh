. "$LAB_LIB"
[ -f found.txt ] || fail "found.txt does not exist yet."
man=$(jq -r '.manifests[0].digest' image/index.json | sed 's/^sha256://')
for d in $(jq -r '.layers[].digest' "image/blobs/sha256/$man" | sed 's/^sha256://'); do
  line=$(tar -xOf "image/blobs/sha256/$d" app/.env 2>/dev/null | head -1)
  [ -z "$line" ] || { grep -qxF "$line" found.txt && exit 0; }
done
fail "found.txt does not hold the DEMO_API_KEY line. Look inside each layer, not just the final result."
