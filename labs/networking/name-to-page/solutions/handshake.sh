openssl s_server -accept $(cat port2.txt) -cert cert.pem -key key.pem -www > /dev/null 2>&1 &
sleep 1
openssl s_client -connect 127.0.0.1:$(cat port2.txt) -servername app.test < /dev/null > handshake.txt 2>&1
