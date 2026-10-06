. "$LAB_LIB"
f=shop/trust-policy.json
jq -e . "$f" >/dev/null 2>&1 || fail "trust-policy.json is not valid JSON (check commas and quotes)."
k='token.actions.githubusercontent.com:sub'
jq -e --arg k "$k" '.Statement[0].Condition.StringLike[$k]' "$f" >/dev/null 2>&1 && fail "Use StringEquals for the subject, not StringLike."
s=$(jq -r --arg k "$k" '.Statement[0].Condition.StringEquals[$k] // ""' "$f")
[ -n "$s" ] || fail "There is no sub condition under StringEquals yet."
case "$s" in *'*'*) fail "No wildcards: the subject must name one repo and branch exactly.";; esac
[ "$s" = "repo:acme-corp/shop:ref:refs/heads/main" ] || fail "The sub should name the main branch of acme-corp/shop exactly."
a=$(jq -r '.Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] // ""' "$f")
[ "$a" = "sts.amazonaws.com" ] || fail "The audience condition went missing - keep it next to sub."
