. "$LAB_LIB"
n=$(cut -d/ -f2 block.txt)
m=$(( (0xFFFFFFFF << (32 - n)) & 0xFFFFFFFF ))
want="$((m >> 24 & 255)).$((m >> 16 & 255)).$((m >> 8 & 255)).$((m & 255))"
[ -f mask.txt ] || fail "mask.txt does not exist yet - write the answer into it."
got=$(tr -d ' \t\r\n' < mask.txt)
[ "$got" = "$want" ] || fail "mask.txt says '$got' - that is not the mask of $(cat block.txt). Use dotted form like 255.255.0.0."
