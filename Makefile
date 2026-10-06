.PHONY: setup api web test mock clean help

VENV = .venv
PYTHON = $(VENV)/bin/python
PIP = $(VENV)/bin/pip
UVICORN = $(VENV)/bin/uvicorn
PYTEST = $(VENV)/bin/pytest
PORT ?= 8001
HOST ?= 0.0.0.0

help:
	@echo "SPHEREx Sky Explorer - Makefile commands"
	@echo "  make setup   - Set up Python virtualenv, install Python and Node dependencies"
	@echo "  make api     - Start FastAPI backend with hot reloading (port $(PORT))"
	@echo "  make web     - Start web frontend dev server (port 3000)"
	@echo "  make test    - Run all pytest unit tests (science + api)"
	@echo "  make mock    - Generate/regenerate mock SPHEREx multi-epoch frames"
	@echo "  make clean   - Clean up Python cache and build artifacts"

setup:
	@echo "==> Setting up Python virtual environment..."
	@if [ ! -d "$(VENV)" ]; then python3 -m venv $(VENV); fi
	$(PIP) install --upgrade pip
	$(PIP) install -e .
	@echo "==> Installing Node dependencies..."
	npm install
	@echo "==> Generating initial mock data..."
	$(PYTHON) scripts/make_mock_data.py
	@echo "==> Setup complete!"

api:
	PYTHONPATH=. $(UVICORN) services.api.app.main:app --host $(HOST) --port $(PORT) --reload

web:
	npm run dev

test:
	PYTHONPATH=. $(PYTEST) -v

mock:
	$(PYTHON) scripts/make_mock_data.py

clean:
	rm -rf __pycache__ science/__pycache__ services/api/app/__pycache__
	rm -rf .pytest_cache
