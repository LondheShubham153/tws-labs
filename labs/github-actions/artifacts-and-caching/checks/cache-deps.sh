. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
[ -f "$f" ] || fail "Workflow file shop/.github/workflows/ci.yml is missing."
steps=$(yaml_get "$f" 'JSON.stringify(d.jobs && d.jobs.build && d.jobs.build.steps)')
[ -n "$steps" ] && [ "$steps" != "null" ] || fail "The build job steps are missing or invalid YAML."

step=$(echo "$steps" | jq -c '.[]? | select((.uses // "") | test("^actions/cache(@.*)?$"))')
[ -n "$step" ] || fail "No step uses actions/cache in the build job."

path=$(echo "$step" | jq -r '.with.path // ""')
case "$path" in
  *node_modules*) ;;
  *) fail "The cache step should set path to node_modules.";;
esac

key=$(echo "$step" | jq -r '.with.key // ""')
case "$key" in
  *runner.os*package-lock.json*) ;;
  *) fail "The cache key should include runner.os and hashFiles of package-lock.json.";;
esac
