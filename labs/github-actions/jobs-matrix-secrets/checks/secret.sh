. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
steps=$(yaml_get "$f" 'd.jobs.deploy ? d.jobs.deploy.steps : []')
[ -n "$steps" ] && [ "$steps" != undefined ] || fail "The deploy job has no steps yet."
re='\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}'
echo "$steps" | jq -e --arg re "$re" '[.[] | select((.run // "") | test("deploy\\.sh")) | select((.env.API_TOKEN // "") | tostring | test($re))] | length > 0' >/dev/null 2>&1 \
  || fail "The ./deploy.sh step has no env: API_TOKEN set from a secret yet."
echo "$steps" | jq -e '[.[] | (.run // "") | select(test("secrets\\."))] | length == 0' >/dev/null 2>&1 \
  || fail "A run line contains a secret expression - pass it through env instead."
echo "$steps" | jq -e '[.[] | (.run // "") | select(test("echo[^\\n]*\\$\\{?API_TOKEN"))] | length == 0' >/dev/null 2>&1 \
  || fail "A run line prints the token - never echo a secret."
