.PHONY: dev dev-frontend dev-backend train seed build stop clean

# ---- Development ----
dev:
	docker-compose up --build

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ---- ML Training ----
train:
	cd backend && python -m ml_models.train_delay_model

# ---- Database ----
seed:
	cd backend && python -m data.seed_airports

# ---- Docker ----
build:
	docker-compose build

stop:
	docker-compose down

clean:
	docker-compose down -v
	rm -rf frontend/.next frontend/node_modules

# ---- Testing ----
test-backend:
	cd backend && python -m pytest tests/ -v

test-frontend:
	cd frontend && npm run build

# ---- Utilities ----
logs:
	docker-compose logs -f

ps:
	docker-compose ps
