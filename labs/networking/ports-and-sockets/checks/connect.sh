. "$LAB_LIB"
port=$(cat port.txt)
listening "$port" || fail "Your listener is not running - start it again with output going to received.txt."
file_has received.txt '^ping' || fail "received.txt does not show ping yet. Was the listener started with > received.txt ?"
