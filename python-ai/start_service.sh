#!/bin/bash
# Start Python AI Service

echo "Starting Python AI Service..."
echo "Make sure you have trained the models first with: python train_all_models.py"
echo ""

cd "$(dirname "$0")"
python services/api_service.py

