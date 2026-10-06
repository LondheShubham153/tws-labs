. "$LAB_LIB"
listening "$(cat port.txt)" || fail "Your first listener stopped - start it again, then retry the second server."
file_has error.txt 'Address already in use' || fail "error.txt does not hold the refusal. Run the openssl command and keep its error output."
