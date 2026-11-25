flask run --cert=cert.pem --key=key.pem

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
