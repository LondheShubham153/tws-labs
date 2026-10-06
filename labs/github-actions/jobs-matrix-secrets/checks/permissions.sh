. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
p=$(yaml_get "$f" 'd.permissions')
{ [ -n "$p" ] && [ "$p" != undefined ]; } || fail "There is no top-level permissions: block yet."
echo "$p" | jq -e 'type == "object"' >/dev/null 2>&1 || fail "permissions should list individual scopes, not a single word like '$p'."
echo "$p" | jq -e '.contents == "read"' >/dev/null 2>&1 || fail "permissions should include contents: read."
echo "$p" | jq -e '[.[]] | all(. == "read" or . == "none")' >/dev/null 2>&1 || fail "permissions allows more than reading."
