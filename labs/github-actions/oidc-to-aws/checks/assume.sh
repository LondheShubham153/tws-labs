. "$LAB_LIB"
f=shop/.github/workflows/deploy.yml
s=$(yaml_get "$f" 'JSON.stringify(d.jobs.deploy.steps || [])')
[ -n "$s" ] || fail "deploy.yml is not valid YAML."
w=$(echo "$s" | jq -c '[.[] | select((.uses // "") | test("^aws-actions/configure-aws-credentials@"))] | .[0].with // empty')
[ -n "$w" ] || fail "No step uses aws-actions/configure-aws-credentials yet."
role=$(echo "$w" | jq -r '.["role-to-assume"] // ""')
[ -n "$role" ] || fail "That step has no role-to-assume yet."
echo "$role" | grep -Eq '^arn:aws:iam::[0-9]{12}:role/.+' || fail "role-to-assume should be a role ARN (arn:aws:iam::ACCOUNT:role/NAME)."
case "$role" in arn:aws:iam::123456789012:role/*) ;; *) fail "Use the placeholder account 123456789012 in this lab - never a real account ID.";; esac
echo "$w" | jq -e '(.["aws-region"] // "") | tostring | length > 0' >/dev/null 2>&1 || fail "Add an aws-region to that step."
