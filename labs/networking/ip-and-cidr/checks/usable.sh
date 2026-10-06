. "$LAB_LIB"
n=$(cut -d/ -f2 block.txt)
[ -f usable.txt ] || fail "usable.txt does not exist yet - write the answer into it."
got=$(tr -d ' \t\r\n' < usable.txt)
[ "$got" = "$((2 ** (32 - n) - 2))" ] || fail "usable.txt says '$got' - think about which addresses a machine cannot use."
