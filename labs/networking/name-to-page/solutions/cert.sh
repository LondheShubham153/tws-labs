openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 1 -subj "/CN=app.test" -addext "subjectAltName=DNS:app.test"
