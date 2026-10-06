. "$LAB_LIB"
port=$(cat port.txt)
listening "$port" || fail "Your listener from the first task is not running any more - start it again."
want=$(ss -tln "sport = :$port" | awk 'NR > 1 { print $4; exit }')
[ -f addr.txt ] || fail "addr.txt does not exist yet - write the Local Address:Port value into it."
got=$(tr -d ' \t\r\n' < addr.txt)
[ "$got" = "$want" ] || fail "addr.txt says '$got' - copy the Local Address:Port column for your port from ss -tln."
