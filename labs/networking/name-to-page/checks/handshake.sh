. "$LAB_LIB"
[ -s handshake.txt ] || fail "handshake.txt is empty or missing. Run the s_server line, then the s_client line."
grep -q 'app\.test' handshake.txt || fail "handshake.txt does not show a certificate for app.test."
grep -qi 'self.signed' handshake.txt || fail "handshake.txt has no verification result yet - did the handshake finish?"
