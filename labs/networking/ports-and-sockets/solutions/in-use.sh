openssl s_server -accept 127.0.0.1:$(cat port.txt) -www -nocert 2> error.txt
