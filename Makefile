.PHONY: install dev db-reset build-prod

install:
	cd backend && pip install -r requirements.txt
	npm install

dev:
	@echo "Starting dev servers..."
	cd backend && source venv/bin/activate && python app.py
	npm run dev

db-reset:
	cd backend && source venv/bin/activate && python -c "from app import app, db; app.app_context().push(); db.drop_all(); db.create_all()"

build-prod:
	cd backend && rm -rf venv
	npm run build