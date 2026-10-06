. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
[ -f "$f" ] || fail "ci.yml is missing."
on=$(yaml_get "$f" 'd[true] || d.on')
{ [ -n "$on" ] && [ "$on" != undefined ]; } || fail "There is no on: section yet."
echo "$on" | jq -e '.push.branches // empty | if type == "array" then index("main") else . == "main" end' >/dev/null 2>&1 \
  || fail "on: does not yet limit push events to the main branch."
