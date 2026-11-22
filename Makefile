.PHONY: start-prod build-and-start-ankixd

start-prod:
	npm run build
	npm start -- --port 3001

build-and-start-ankixd:
	npm run build:ankixd
	pm2 stop 'ankixd' || true
	pm2 start ./ecosystem.config.js
