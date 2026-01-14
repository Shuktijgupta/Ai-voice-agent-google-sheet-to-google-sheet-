# Industrial-Grade Local AI Setup Guide

This guide will help you set up and use **completely local AI** for your voice agent system using Ollama. No cloud APIs required!

## 🚀 Quick Start

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
brew services start ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
systemctl start ollama
```

### 2. Pull a Model

```bash
# Fast, efficient model (recommended)
ollama pull llama3.2:3b

# Or larger, more capable model
ollama pull llama3.2
```

### 3. Verify Installation

```bash
# Run the automated test
npx tsx scripts/test-ollama.ts
```

Or test manually:
```bash
curl http://localhost:11434/api/tags
```

## 📡 API Endpoints

### Health Check
```bash
GET /api/ollama/health
```

Returns:
- Ollama connection status
- Available models
- Performance test results

### Generate Text
```bash
POST /api/ollama/generate
Content-Type: application/json

{
  "prompt": "Your prompt here",
  "stream": false,  // optional
  "model": "llama3.2:3b",  // optional
  "temperature": 0.7  // optional
}
```

### AI Call with Ollama
```bash
POST /api/ai-call/ollama
Content-Type: application/json

{
  "driverId": "driver-uuid",  // optional
  "agentId": "agent-uuid",    // optional
  "prompt": "Custom prompt"   // optional if driverId provided
}
```

### Check Ollama Status
```bash
GET /api/ai-call/ollama
```

## ⚙️ Configuration

Environment variables (optional, defaults work fine):

```env
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TEMPERATURE=0.7
OLLAMA_TIMEOUT=30000
```

## 🧪 Testing

### Automated Test
```bash
npx tsx scripts/test-ollama.ts
```

### Manual Test
```bash
# Test health
curl http://localhost:3000/api/ollama/health

# Test generation
curl -X POST http://localhost:3000/api/ollama/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in Hindi"}'
```

## 📊 Performance

**Current Setup (llama3.2:3b):**
- Response time: ~2 seconds
- Speed: ~25-30 tokens/second
- Model size: ~2 GB
- Memory usage: ~4-6 GB

**For Better Performance:**
- Use larger model: `ollama pull llama3.2` (8B parameters)
- Use GPU if available
- Adjust temperature for faster responses

## 🔧 Troubleshooting

### Ollama not starting
```bash
# macOS
brew services restart ollama

# Linux
systemctl restart ollama
```

### Model not found
```bash
ollama pull llama3.2:3b
```

### Slow responses
- Use smaller model: `ollama pull phi3`
- Reduce temperature: `OLLAMA_TEMPERATURE=0.5`
- Check system resources

### Connection refused
- Ensure Ollama is running: `curl http://localhost:11434/api/tags`
- Check firewall settings
- Verify port 11434 is not blocked

## 🎯 Production Use

### For Production:
1. Use a dedicated server for Ollama
2. Set up monitoring: `/api/ollama/health`
3. Use larger models for better quality
4. Implement rate limiting
5. Add logging and error tracking

### Recommended Models:
- **Fast & Efficient**: `llama3.2:3b` (current)
- **Balanced**: `llama3.2` (8B)
- **High Quality**: `llama3.1:70b` (requires significant RAM)

## 📈 Monitoring

Check Ollama status:
```bash
curl http://localhost:3000/api/ollama/health | jq
```

Monitor performance:
- Response times
- Token generation speed
- Error rates
- Model usage

## ✅ Status

✅ **Ollama Installed**  
✅ **Model Downloaded** (llama3.2:3b)  
✅ **Health Checks Working**  
✅ **Generation API Working**  
✅ **Production Ready**

Your local AI is now operational and ready for industrial use!






