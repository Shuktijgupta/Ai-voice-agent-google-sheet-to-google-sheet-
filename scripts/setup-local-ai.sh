#!/bin/bash

# Industrial-Grade Local AI Setup Script
# Sets up Ollama for production use

set -e

echo "🚀 Setting up Industrial-Grade Local AI..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama not found. Installing...${NC}"
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            echo -e "${RED}Please install Homebrew first: https://brew.sh${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://ollama.com/install.sh | sh
    else
        echo -e "${RED}Unsupported OS. Please install Ollama manually from https://ollama.com${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Ollama is installed${NC}"

# Start Ollama service
echo "Starting Ollama service..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start ollama || ollama serve &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    systemctl start ollama 2>/dev/null || ollama serve &
fi

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama is running${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Ollama failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Check if model is installed
echo "Checking for models..."
MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | head -1)

if [ -z "$MODELS" ]; then
    echo -e "${YELLOW}No models found. Installing llama3.2:3b (fast, efficient)...${NC}"
    ollama pull llama3.2:3b
    echo -e "${GREEN}✓ Model installed${NC}"
else
    echo -e "${GREEN}✓ Models found: $MODELS${NC}"
fi

# Test Ollama
echo "Testing Ollama..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{"model":"llama3.2:3b","prompt":"Say hello","stream":false}')

if echo "$TEST_RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✓ Ollama is working correctly!${NC}"
else
    echo -e "${RED}✗ Ollama test failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Local AI Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Ollama is running at: http://localhost:11434"
echo "Test endpoint: http://localhost:3000/api/ollama/health"
echo "Generate endpoint: http://localhost:3000/api/ollama/generate"
echo ""
echo "You can now use local AI in your application!"






