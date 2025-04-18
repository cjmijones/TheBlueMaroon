#!/bin/bash

# Resolve paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
ENV_FILE="$BACKEND_DIR/.env"

echo "📦 Setting up virtual environment in: $BACKEND_DIR"

# Load .env if it exists
if [ -f "$ENV_FILE" ]; then
    echo "📄 Loading environment variables from .env"
    export $(grep -v '^#' "$ENV_FILE" | xargs -d '\n')
else
    echo "⚠️  No .env file found in backend/"
fi

# Step 1: Create venv
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv "$BACKEND_DIR/venv"
else
    echo "✅ Virtual environment already exists."
fi

# Step 2: Activate it
# shellcheck disable=SC1090
source "$BACKEND_DIR/venv/bin/activate"

# Step 3: Install requirements
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
    echo "📄 Installing core requirements..."
    python -m pip install --upgrade pip
    pip install -r "$BACKEND_DIR/requirements.txt"
fi

# Step 4: Optionally install dev dependencies
if [ "$ENV_TYPE" = "dev" ] && [ -f "$BACKEND_DIR/requirements-dev.txt" ]; then
    echo "🛠  Installing dev dependencies..."
    pip install -r "$BACKEND_DIR/requirements-dev.txt"
else
    echo "Skipping dev dependencies (ENV_TYPE=$ENV_TYPE)"
fi

echo ""
echo "✅ Environment ready and activated."
echo "📌 Use 'deactivate' to exit the virtual environment."
