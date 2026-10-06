. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
m=$(yaml_get "$f" 'd.jobs && d.jobs.test && d.jobs.test.strategy && d.jobs.test.strategy.matrix')
{ [ -n "$m" ] && [ "$m" != undefined ] && [ "$m" != false ]; } || fail "There is no test job with strategy: matrix: yet."
echo "$m" | jq -e '(.node | type == "array" and length >= 2) and (.os | type == "array" and length >= 2)' >/dev/null 2>&1 \
  || fail "The matrix needs a node list and an os list, each with at least two values."
r=$(yaml_get "$f" 'd.jobs.test["runs-on"]')
case "$r" in *matrix.os*) ;; *) fail "The test job should take its runner from the matrix (runs-on: with matrix.os).";; esac
