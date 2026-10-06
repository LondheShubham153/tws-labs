. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
ok=$(yaml_get "$f" 'd.jobs && d.jobs.build && Array.isArray(d.jobs.build.steps) && d.jobs.build.steps.slice(1).some(function (s) { return /\bnpm (run )?test\b/.test(s.run || "") })')
[ "$ok" = true ] || fail "No step after the checkout runs npm test yet."
