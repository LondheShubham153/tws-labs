. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
ex=$(yaml_get "$f" 'd.jobs.test.strategy.matrix')
echo "$ex" | jq -e '. as $m | [($m.exclude // [])[] | select((.os as $o | $m.os | index($o)) and (.node as $n | $m.node | map(tostring) | index($n | tostring)))] | length >= 1' >/dev/null 2>&1 \
  || fail "No exclude entry skips a real node + os combination yet."
