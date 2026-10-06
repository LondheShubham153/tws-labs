awk -F'[./]' '{ s = $1*16777216 + $2*65536 + $3*256 + $4; S[NR] = s; E[NR] = s + 2^(32-$5) - 1 } END { print (S[1] <= E[2] && S[2] <= E[1]) ? "yes" : "no" }' pair.txt > overlap.txt
