. "$LAB_LIB"
f=shop/.github/workflows/ci.yml
want=$(yaml_get "$f" '(function () { var m = d.jobs.test.strategy.matrix, n = 0;
  (m.node || []).forEach(function (a) { (m.os || []).forEach(function (b) {
    var gone = (m.exclude || []).some(function (e) { return (e.node === undefined || String(e.node) === String(a)) && (e.os === undefined || e.os === b); });
    if (!gone) n++; }); }); return n; })()')
[ -n "$want" ] || fail "The test job's matrix is not readable yet."
[ -f shop/jobs.txt ] || fail "shop/jobs.txt does not exist yet."
got=$(tr -d '[:space:]' < shop/jobs.txt)
[ -n "$got" ] || fail "shop/jobs.txt is empty."
[ "$got" = "$want" ] || fail "jobs.txt says $got - recount the combinations in your matrix."
