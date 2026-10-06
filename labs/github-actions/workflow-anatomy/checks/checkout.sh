. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
s=$(yaml_get "$f" 'd.jobs && d.jobs.build && d.jobs.build.steps && d.jobs.build.steps[0] && d.jobs.build.steps[0].uses')
{ [ -n "$s" ] && [ "$s" != undefined ] && [ "$s" != false ]; } || fail "The build job's first step is not a uses: step yet."
case "$s" in actions/checkout@*) ;; *) fail "The first step uses '$s' - it should be actions/checkout at some version.";; esac
