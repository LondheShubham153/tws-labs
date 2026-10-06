curl -v --resolve app.test:$(cat port.txt):127.0.0.1 http://app.test:$(cat port.txt)/ 2> verbose.txt
