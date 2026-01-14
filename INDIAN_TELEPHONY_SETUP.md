# Indian Telephony Provider Setup Guide

Complete guide to set up your self-hosted voice agent with **Indian telephony providers**.

## 🇮🇳 Supported Indian Providers

1. **Exotel** (Most Popular) - https://exotel.com
2. **Knowlarity** - https://knowlarity.com
3. **Ozonetel** - https://ozonetel.com
4. **Tata Telebusiness SmartFlo** - https://tatatelebusiness.com
5. **Plivo** (Supports India) - https://plivo.com

## 🚀 Quick Setup

### Option 1: Exotel (Recommended for India)

1. **Sign up at Exotel:**
   - Go to https://exotel.com
   - Create account
   - Get phone number

2. **Get Credentials:**
   - API Key (SID)
   - API Token
   - Phone Number
   - Subdomain (usually 'api')

3. **Add to .env:**
   ```env
   EXOTEL_API_KEY=your_exotel_sid
   EXOTEL_API_TOKEN=your_exotel_token
   EXOTEL_PHONE_NUMBER=+91XXXXXXXXXX
   EXOTEL_SUBDOMAIN=api
   ```

### Option 2: Knowlarity

1. **Sign up at Knowlarity:**
   - Go to https://knowlarity.com
   - Create account
   - Get phone number

2. **Add to .env:**
   ```env
   KNOWLARITY_API_KEY=your_api_key
   KNOWLARITY_API_TOKEN=your_api_token
   KNOWLARITY_PHONE_NUMBER=+91XXXXXXXXXX
   ```

### Option 3: Ozonetel

1. **Sign up at Ozonetel:**
   - Go to https://ozonetel.com
   - Create account
   - Get phone number

2. **Add to .env:**
   ```env
   OZONETEL_API_KEY=your_api_key
   OZONETEL_API_TOKEN=your_api_token
   OZONETEL_PHONE_NUMBER=+91XXXXXXXXXX
   ```

### Option 4: Tata Telebusiness SmartFlo

1. **Sign up at Tata Telebusiness:**
   - Go to https://tatatelebusiness.com
   - Create account
   - Navigate to SmartFlo dashboard

2. **Generate API Key:**
   - Go to "API Connect" section
   - Select "Click to Call Support API"
   - Click "Generate API Key"
   - Choose DID number(s) and assign agent number
   - Save configuration

3. **Get Credentials:**
   - API Key (from dashboard)
   - API Token (Bearer token)
   - Agent Number (SmartFlo agent who receives calls)
   - Phone Number (DID number for caller ID)

4. **Add to .env:**
   ```env
   TATA_API_KEY=your_api_key
   TATA_API_TOKEN=your_bearer_token
   TATA_AGENT_NUMBER=+91XXXXXXXXXX
   TATA_PHONE_NUMBER=+91XXXXXXXXXX
   TATA_CALL_TIMEOUT=300
   ```

   **Important:** `TATA_AGENT_NUMBER` is required - this is the SmartFlo agent number that will receive the call.

5. **Webhook Configuration:**
   - Configure webhook URL in SmartFlo dashboard: `https://your-domain.com/api/self-hosted-voice/webhook`
   - For local testing, use ngrok: `https://abc123.ngrok.io/api/self-hosted-voice/webhook`

**Documentation:** https://docs.smartflo.tatatelebusiness.com/reference/v1click_to_call

### Option 5: Plivo

1. **Sign up at Plivo:**
   - Go to https://plivo.com
   - Create account
   - Get India phone number

2. **Add to .env:**
   ```env
   PLIVO_AUTH_ID=your_auth_id
   PLIVO_AUTH_TOKEN=your_auth_token
   PLIVO_PHONE_NUMBER=+91XXXXXXXXXX
   ```

### Option 6: Custom Provider

If you have your own telephony provider:

```env
TELEPHONY_PROVIDER=custom
TELEPHONY_API_URL=https://your-provider.com/api/call
TELEPHONY_API_KEY=your_key
TELEPHONY_API_SECRET=your_secret
TELEPHONY_PHONE_NUMBER=+91XXXXXXXXXX
```

## 📋 Complete .env Example

```env
# Ollama (Already configured)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Exotel (Example - use any provider)
EXOTEL_API_KEY=your_exotel_sid
EXOTEL_API_TOKEN=your_exotel_token
EXOTEL_PHONE_NUMBER=+91XXXXXXXXXX
EXOTEL_SUBDOMAIN=api

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Or use ngrok: https://abc123.ngrok.io
```

## 🔧 Webhook Setup

Your telephony provider needs to reach your app. For local development:

### Using ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose your app
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update .env:
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### Webhook URL Format:

Your webhook URL should be:
```
https://your-domain.com/api/self-hosted-voice/webhook
```

## 📞 Making Calls

Once configured:

1. **Set Provider:**
   - Go to Settings/Integrations
   - Select "Self-Hosted Voice Agent"

2. **Make a Call:**
   - Go to Drivers page
   - Click "AI Call" button
   - The agent will call via your Indian provider!

## 🎯 How It Works

1. **Call Initiated** → Your provider dials the number
2. **Agent Speaks** → Ollama generates response, provider TTS speaks
3. **User Responds** → Provider ASR transcribes
4. **AI Processes** → Ollama generates intelligent response
5. **Conversation Continues** → Steps 3-4 repeat
6. **Call Ends** → Recording saved, transcript & summary generated

## 💰 Cost Comparison

| Provider | Setup Cost | Per Minute | Best For |
|----------|-----------|------------|----------|
| **Exotel** | Low | ₹0.50-1.00 | Most features |
| **Knowlarity** | Low | ₹0.40-0.80 | Good balance |
| **Ozonetel** | Low | ₹0.50-1.00 | Enterprise |
| **Tata SmartFlo** | Low | ₹0.50-1.00 | Enterprise, reliable |
| **Plivo** | Low | $0.01-0.02 | International |

**All much cheaper than Bland AI!**

## ✅ Features

Your self-hosted agent provides:
- ✅ Automatic phone calls
- ✅ AI conversation (Ollama)
- ✅ Call recording
- ✅ Full transcript
- ✅ Call summary
- ✅ Answer extraction
- ✅ Call duration

## 🐛 Troubleshooting

### "No telephony provider configured"
- Check `.env` has credentials for one provider
- Restart app: `npm run dev`

### "Webhook not reachable"
- Use ngrok for local testing
- Or deploy to Vercel/Railway
- Update `NEXT_PUBLIC_APP_URL`

### "Call not connecting"
- Verify phone number format: +91XXXXXXXXXX
- Check provider account has credits
- Verify webhook URL is accessible

## 🎉 You're Ready!

Your self-hosted voice agent now works with **Indian telephony providers**!

No need for Twilio - use any Indian provider you prefer.




