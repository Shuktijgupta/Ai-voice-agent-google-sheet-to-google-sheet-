# Bolna Local AI Setup

This folder contains the Docker setup for running Bolna with Ollama (free local LLM).

## Prerequisites

1. **Docker Desktop** - Install from https://docker.com
2. **Ollama** - Install from https://ollama.com
3. **Deepgram Account** - Free at https://console.deepgram.com

## Quick Start

### Step 1: Install and Start Ollama

```powershell
# After installing Ollama, pull a model
ollama pull llama3.2

# Verify it's running
curl http://localhost:11434/api/tags
```

### Step 2: Create .env file

Create a `.env` file in this folder with:

```env
# Required: Deepgram for Speech Recognition
DEEPGRAM_AUTH_TOKEN=your_deepgram_key

# TTS - Use one of these:
ELEVENLABS_API_KEY=your_key    # Premium voices
# OR
OPENAI_API_KEY=your_key        # Good quality

# Required for Phone Calls: Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Start Bolna

```powershell
cd bolna-local
docker compose up -d
```

### Step 4: Verify

```powershell
# Check Bolna is running
curl http://localhost:5001/health
```

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| **Ollama** | Unlimited (runs locally) |
| **Deepgram** | $200 credit (lots of minutes) |
| **ElevenLabs** | 10,000 characters/month |
| **Twilio** | ~$15 trial credit |

## Troubleshooting

### Ollama not connecting
- Make sure Ollama is running: `ollama serve`
- Check it's accessible: `curl http://localhost:11434/api/tags`

### Docker issues
- Ensure Docker Desktop is running
- Try: `docker compose down && docker compose up -d`

### Model too slow
- Use a smaller model: `ollama pull phi3`
- Or quantized version: `ollama pull llama3.2:3b-q4_0`
