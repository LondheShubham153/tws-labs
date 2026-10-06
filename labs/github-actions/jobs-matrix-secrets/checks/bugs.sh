. "$LAB_LIB"
f=shop/.github/workflows/broken.yml
[ -f "$f" ] || fail "broken.yml is missing."
left=0
p=$(yaml_get "$f" 'JSON.stringify(d.permissions === undefined ? "none-set" : d.permissions)')
[ -n "$p" ] || fail "broken.yml is not valid YAML any more."
case "$p" in *write*|*none-set*) left=$((left + 1));; esac
steps=$(yaml_get "$f" 'JSON.stringify(d.jobs.release.steps)')
[ -n "$steps" ] || fail "broken.yml lost its release job."
bad=$(echo "$steps" | jq '[.[] | select(.uses) | .uses | select(test("@(v?[0-9][0-9.]*|[0-9a-f]{40})$") | not)] | length')
[ "$bad" -gt 0 ] && left=$((left + 1))
leaks=$(echo "$steps" | jq '[.[] | (.run // "") | select(test("secrets\\."))] | length')
[ "$leaks" -gt 0 ] && left=$((left + 1))
[ "$left" -eq 0 ] || fail "Not yet - $left of the 3 problems are still there."
