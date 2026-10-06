. "$LAB_LIB"
[ -f compose.yaml ] || fail "No compose.yaml yet - create ~/compose.yaml."
ok=$(yaml_get compose.yaml '(function () { var n = Object.keys(d.networks || {}); return Object.values(d.services || {}).filter(function (s) { var x = s.networks; var names = Array.isArray(x) ? x : Object.keys(x || {}); return names.some(function (k) { return n.indexOf(k) >= 0; }); }).length >= 2; })()')
[ -n "$ok" ] || fail "compose.yaml is not valid YAML."
[ "$ok" = true ] || fail "Declare a top-level network and attach both services to it."
