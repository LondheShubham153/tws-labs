. "$LAB_LIB"
n=$(cut -d/ -f2 block.txt)
[ -f total.txt ] || fail "total.txt does not exist yet - write the answer into it."
got=$(tr -d ' \t\r\n' < total.txt)
[ "$got" = "$((2 ** (32 - n)))" ] || fail "total.txt says '$got' - that is not the address count of $(cat block.txt)."
