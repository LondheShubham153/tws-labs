. "$LAB_LIB"
f=shop/trust-policy.json
jq -e . "$f" >/dev/null 2>&1 || fail "trust-policy.json is not valid JSON (check commas and quotes)."
a=$(jq -r '.Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:aud"] // ""' "$f")
if [ "$a" != "sts.amazonaws.com" ]; then
  jq -e '.Statement[0].Condition.StringLike["token.actions.githubusercontent.com:aud"]' "$f" >/dev/null 2>&1 && fail "Put the audience under StringEquals, not StringLike."
  fail "The audience condition is missing or wrong."
fi
