. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
[ -f "$f" ] || fail "Workflow file shop/.github/workflows/ci.yml is missing."
deploy=$(yaml_get "$f" 'JSON.stringify(d.jobs && d.jobs.deploy)')
[ -n "$deploy" ] && [ "$deploy" != "null" ] || fail "Add a deploy job under jobs:."

runner=$(echo "$deploy" | jq -r '."runs-on" // ""')
case "$runner" in
  ubuntu-*) ;;
  *) fail "The deploy job should set runs-on: ubuntu-latest.";;
esac

needs=$(echo "$deploy" | jq -r 'if (.needs | type) == "array" then (.needs | join(",")) else (.needs // "") end')
case ",$needs," in
  *,build,*) ;;
  *) fail "The deploy job must declare needs: [build].";;
esac

step=$(echo "$deploy" | jq -c '.steps[]? | select((.uses // "") | test("^actions/download-artifact(@.*)?$")) | select(.with.name == "dist-files")')
[ -n "$step" ] || fail "The deploy job needs a step using actions/download-artifact with name: dist-files."
