. "$LAB_LIB"
[ -f ip.txt ] || fail "ip.txt does not exist yet - write the address into it."
got=$(tr -d ' \t\r\n' < ip.txt)
{ getent hosts localhost; getent ahosts localhost; } | awk '{ print $1 }' | grep -qxF "$got" || fail "ip.txt says '$got' - that is not an address getent gives for localhost."
