Fresh Dumbledore Mumble Bot
===========================

A bot which stays in a channel and moves users into another channel after a given amount of time playing music in a loop.

Setup:
------

Generate a keypair like this:
```sh
	openssl genrsa -out bot.key 2048 2> /dev/null
	openssl req -new -sha256 -key bot.key -out bot.csr -subj "/"
	openssl x509 -req -in bot.csr -signkey bot.key -out bot.cert 2> /dev/null
```
