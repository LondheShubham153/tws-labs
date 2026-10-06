. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
n=$(yaml_get "$f" 'd.jobs.deploy ? [].concat(d.jobs.deploy.needs || []) : null')
[ "$n" != null ] && [ -n "$n" ] || fail "There is no deploy job yet."
echo "$n" | jq -e 'length > 0' >/dev/null 2>&1 || fail "deploy has no needs yet."
jobs=$(yaml_get "$f" 'Object.keys(d.jobs)')
echo "$n" | jq -e --argjson j "$jobs" 'all(.[]; . as $x | $j | index($x))' >/dev/null 2>&1 || fail "deploy needs a job that does not exist."
echo "$n" | jq -e 'index("build") and index("test")' >/dev/null 2>&1 || fail "deploy should wait for both build and test."
r=$(yaml_get "$f" 'd.jobs.deploy["runs-on"]')
[ -n "$r" ] && [ "$r" != undefined ] || fail "deploy needs a runs-on."
yaml_get "$f" 'JSON.stringify(d.jobs.deploy.steps || [])' | jq -e 'any(.[]; (.run // "") | test("deploy\\.sh"))' >/dev/null 2>&1 || fail "deploy has no step that runs ./deploy.sh."
