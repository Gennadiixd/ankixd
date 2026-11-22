.PHONY: start-prod

start-prod:
	npm run build
	npm start -- --port 3001
