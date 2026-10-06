#!/bin/bash
# Rebuilds fixture/image: a tiny OCI image layout the lab teaches from. Not used at runtime.
# Needs GNU tar, jq and sha256sum, so run it in the lab image:
#   docker run --rm -v "$PWD/labs/docker/layers-and-compose/fixture:/f" --entrypoint bash tws-labs:dev /f/build.sh
# Output is reproducible: fixed timestamps and owners.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
out="$here/image"
rm -rf "$out"; mkdir -p "$out/blobs/sha256" "$work/l1/app" "$work/l2/app" "$work/l3/app"

printf 'console.log("hello from the image");\n' > "$work/l1/app/server.js"
printf 'DEMO_API_KEY=tws-demo-4f9c2a71\n' > "$work/l2/app/.env"
: > "$work/l3/app/.wh..env"        # whiteout: "this path is deleted in this layer"

tarit() { tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -b 1 -cf "$2" -C "$1" app; }
sha() { sha256sum "$1" | cut -d' ' -f1; }
blob() { local d; d=$(sha "$1"); cp "$1" "$out/blobs/sha256/$d"; echo "$d"; }

layers=()
for n in 1 2 3; do tarit "$work/l$n" "$work/l$n.tar"; layers+=("$(blob "$work/l$n.tar")"); done

jq -n --arg a "${layers[0]}" --arg b "${layers[1]}" --arg c "${layers[2]}" '{
  architecture: "amd64", os: "linux",
  config: { Cmd: ["node", "/app/server.js"], WorkingDir: "/app" },
  rootfs: { type: "layers", diff_ids: ["sha256:" + $a, "sha256:" + $b, "sha256:" + $c] },
  history: [ { created_by: "COPY server.js /app/server.js" }, { created_by: "COPY .env /app/.env" }, { created_by: "RUN rm /app/.env" } ]
}' > "$work/config.json"
cfg=$(blob "$work/config.json")

jq -n --arg cfg "$cfg" --argjson cs "$(wc -c < "$work/config.json")" \
  --arg a "${layers[0]}" --arg b "${layers[1]}" --arg c "${layers[2]}" \
  --argjson sa "$(wc -c < "$work/l1.tar")" --argjson sb "$(wc -c < "$work/l2.tar")" --argjson sc "$(wc -c < "$work/l3.tar")" '{
  schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json",
  config: { mediaType: "application/vnd.oci.image.config.v1+json", digest: ("sha256:" + $cfg), size: $cs },
  layers: [
    { mediaType: "application/vnd.oci.image.layer.v1.tar", digest: ("sha256:" + $a), size: $sa },
    { mediaType: "application/vnd.oci.image.layer.v1.tar", digest: ("sha256:" + $b), size: $sb },
    { mediaType: "application/vnd.oci.image.layer.v1.tar", digest: ("sha256:" + $c), size: $sc } ]
}' > "$work/manifest.json"
man=$(blob "$work/manifest.json")

jq -n --arg m "$man" --argjson s "$(wc -c < "$work/manifest.json")" \
  '{ schemaVersion: 2, manifests: [ { mediaType: "application/vnd.oci.image.manifest.v1+json", digest: ("sha256:" + $m), size: $s } ] }' > "$out/index.json"
printf '{"imageLayoutVersion":"1.0.0"}\n' > "$out/oci-layout"
rm -rf "$work"
echo "built $out"
