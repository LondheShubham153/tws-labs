. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
[ -f "$f" ] || fail "Workflow file shop/.github/workflows/ci.yml is missing."
steps=$(yaml_get "$f" 'JSON.stringify(d.jobs && d.jobs.build && d.jobs.build.steps)')
[ -n "$steps" ] && [ "$steps" != "null" ] || fail "The build job steps are missing or invalid YAML."

step=$(echo "$steps" | jq -c '.[]? | select((.uses // "") | test("^actions/upload-artifact(@.*)?$")) | select(.with.name == "test-reports")')
[ -n "$step" ] || fail "Add a step using actions/upload-artifact with name: test-reports."

path=$(echo "$step" | jq -r '.with.path // ""')
case "$path" in
  test-results|test-results/|./test-results|./test-results/) ;;
  *) fail "The test-reports upload step should set path to test-results.";;
esac

cond=$(echo "$step" | jq -r '.if // ""')
case "$cond" in
  *always\(\)*) ;;
  *) fail "Add if: always() so test reports upload even if earlier steps fail.";;
esac
