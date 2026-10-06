. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
r=$(yaml_get "$f" 'd.jobs && d.jobs.build && d.jobs.build["runs-on"]')
{ [ -n "$r" ] && [ "$r" != undefined ] && [ "$r" != false ]; } || fail "There is no build job with a runs-on yet."
case "$r" in ubuntu-*) ;; *) fail "build runs on '$r' - this lab wants an Ubuntu runner (ubuntu-latest).";; esac
