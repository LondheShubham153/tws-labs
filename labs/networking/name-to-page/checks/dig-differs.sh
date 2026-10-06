. "$LAB_LIB"
ran_re '(^|[;&|][[:space:]]*)dig[[:space:]].*localhost' || fail "Run dig against localhost, asking the server @127.0.0.1, as shown."
