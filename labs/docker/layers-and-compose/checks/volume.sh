. "$LAB_LIB"
[ -f compose.yaml ] || fail "No compose.yaml yet - create ~/compose.yaml."
two=$(yaml_get compose.yaml 'Object.keys(d.services || {}).length >= 2')
[ -n "$two" ] || fail "compose.yaml is not valid YAML."
[ "$two" = true ] || fail "Define two services under services: (web and db)."
ok=$(yaml_get compose.yaml 'Object.values(d.services).some(function (s) { return (s.volumes || []).some(function (v) { return typeof v === "string" && Object.prototype.hasOwnProperty.call(d.volumes || {}, v.split(":")[0]); }); })')
[ "$ok" = true ] || fail "No service mounts a named volume yet. Declare it at the top level and use it as name:/path."
