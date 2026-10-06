. "$LAB_LIB"
f=shop/.github/workflows/deploy.yml
p=$(yaml_get "$f" 'JSON.stringify([d.permissions, d.jobs.deploy.permissions])')
[ -n "$p" ] || fail "deploy.yml is not valid YAML (or the deploy job is missing)."
echo "$p" | jq -e 'any(.[]; type == "object" and .["id-token"] == "write")' >/dev/null 2>&1 || fail "No permissions: id-token: write yet."
echo "$p" | jq -e 'any(.[]; type == "object" and .["id-token"] == "write" and .contents == "read")' >/dev/null 2>&1 \
  || fail "Also allow contents: read - once permissions is set, everything unlisted is none, and checkout needs it."
