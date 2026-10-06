nc -lk 127.0.0.1 $(cat port.txt) > received.txt &
sleep 0.5
