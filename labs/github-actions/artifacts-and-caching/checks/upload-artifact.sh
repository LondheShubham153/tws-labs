. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
[ -f "$f" ] || fail "Workflow file shop/.github/workflows/ci.yml is missing."
steps=$(yaml_get "$f" 'JSON.stringify(d.jobs && d.jobs.build && d.jobs.build.steps)')
[ -n "$steps" ] && [ "$steps" != "null" ] || fail "The build job steps are missing or invalid YAML."

step=$(echo "$steps" | jq -c '.[]? | select((.uses // "") | test("^actions/upload-artifact(@.*)?$")) | select(.with.name == "dist-files")')
[ -n "$step" ] || fail "No step under build uses actions/upload-artifact with name: dist-files."

path=$(echo "$step" | jq -r '.with.path // ""')
case "$path" in
  dist|dist/|./dist|./dist/) ;;
  *) fail "The dist-files artifact path should be set to dist.";;
esac
