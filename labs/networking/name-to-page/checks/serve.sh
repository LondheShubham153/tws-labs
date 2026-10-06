. "$LAB_LIB"
port=$(cat port.txt)
listening "$port" || { sleep 0.4; listening "$port"; } || fail "Nothing listens on port $port yet. Start the server with: bash server.sh &"
