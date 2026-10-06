. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
v=$(yaml_get "$f" 'd.jobs.test.strategy["fail-fast"]')
[ "$v" = false ] || fail "fail-fast is not turned off for the test job (found: ${v:-nothing})."
