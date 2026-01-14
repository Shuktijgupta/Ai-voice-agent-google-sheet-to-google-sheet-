# Tata Telebusiness SmartFlo Click-to-Call Setup

Complete guide to integrate **Tata Telebusiness SmartFlo** Click-to-Call API with your AI voice agent.

## 📚 API Documentation

Official Documentation: https://docs.smartflo.tatatelebusiness.com/reference/v1click_to_call

## 🚀 Quick Setup

### Step 1: Create SmartFlo Account

1. Go to https://tatatelebusiness.com
2. Sign up for SmartFlo account
3. Complete account verification

### Step 2: Generate API Key

1. **Login to SmartFlo Dashboard**
2. Navigate to **"API Connect"** section
3. Select **"Click to Call Support API"**
4. Click **"Generate API Key"**
5. **Configure:**
   - Choose DID number(s) from which calls will be initiated
   - Assign destination (agent) for the calls
   - Save configuration

### Step 3: Get Your Credentials

You'll need:
- **API Key**: Generated from dashboard
- **API Token**: Bearer token for authentication
- **Agent Number**: SmartFlo agent number who will receive calls (required)
- **Phone Number**: DID number for caller ID

### Step 4: Configure Environment Variables

Add to your `.env` file:

```env
# Tata Telebusiness SmartFlo
TATA_API_KEY=your_api_key_here
TATA_API_TOKEN=your_bearer_token_here
TATA_AGENT_NUMBER=+91XXXXXXXXXX
TATA_PHONE_NUMBER=+91XXXXXXXXXX
TATA_CALL_TIMEOUT=300

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# For local testing with ngrok:
# NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

**Important Notes:**
- `TATA_AGENT_NUMBER` is **REQUIRED** - This is the SmartFlo agent who will receive the call
- `TATA_PHONE_NUMBER` is the caller ID shown to the called party
- `TATA_CALL_TIMEOUT` is optional (in seconds, default: 300 = 5 minutes)

### Step 5: Configure Webhooks

Tata SmartFlo uses webhooks to send real-time call events. Configure in your SmartFlo dashboard:

**Webhook URL:**
```
https://your-domain.com/api/self-hosted-voice/webhook
```

**For Local Development:**
1. Install ngrok: `brew install ngrok` (macOS) or download from https://ngrok.com
2. Run: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update `.env`: `NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io`
5. Configure webhook in SmartFlo dashboard with: `https://abc123.ngrok.io/api/self-hosted-voice/webhook`

## 📋 API Request Format

The integration automatically sends requests in this format:

```json
{
  "agent_number": "+91XXXXXXXXXX",      // Required: SmartFlo agent number
  "destination_number": "+91XXXXXXXXXX", // Required: Customer number to call
  "caller_id": "+91XXXXXXXXXX",         // Optional: Caller ID
  "async": 1,                            // Required: 1 for asynchronous
  "call_timeout": 300,                   // Optional: Max call duration (seconds)
  "custom_identifier": "{...}"          // Optional: Custom data (includes driverId, agentId, webhookUrl)
}
```

## 🔄 How It Works

1. **Call Initiation**: Your app sends POST request to Tata SmartFlo API
2. **Async Response**: API returns immediately with "Call originated successfully"
3. **Webhook Events**: Tata sends webhook events for:
   - Call connected
   - Agent answered
   - Call ended
   - Call recording available
4. **AI Processing**: Your app processes webhooks and updates call status

## 🎯 Features

- ✅ **Click-to-Call**: Initiate calls programmatically
- ✅ **Asynchronous**: Don't wait for agent pickup
- ✅ **Webhook Support**: Real-time call event updates
- ✅ **Call Recording**: Automatic recording available via webhook
- ✅ **Custom Identifiers**: Pass custom data that's returned in webhooks
- ✅ **Call Timeout**: Automatic call disconnection after timeout

## 🐛 Troubleshooting

### "TATA_AGENT_NUMBER is required"
- Make sure you've set `TATA_AGENT_NUMBER` in your `.env` file
- This must be a valid SmartFlo agent number configured in your dashboard

### "Tata SmartFlo API error: 401"
- Check your `TATA_API_TOKEN` (Bearer token) is correct
- Verify token hasn't expired
- Regenerate token in SmartFlo dashboard if needed

### "Tata SmartFlo API error: 400"
- Verify `agent_number` is valid and configured in dashboard
- Check `destination_number` format: must be +91XXXXXXXXXX
- Ensure account has sufficient credits

### "Webhook not receiving events"
- Verify webhook URL is accessible (use ngrok for local testing)
- Check webhook is configured in SmartFlo dashboard
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- Check webhook endpoint: `/api/self-hosted-voice/webhook`

### "Call not connecting"
- Verify phone numbers are in correct format: +91XXXXXXXXXX
- Check account has sufficient credits
- Verify agent number is active in SmartFlo dashboard
- Check call timeout settings

## 📞 Making Your First Call

1. **Set Provider:**
   - Go to Settings/Integrations in your app
   - Select "Self-Hosted Voice Agent"
   - System will auto-detect Tata if credentials are set

2. **Make a Call:**
   - Go to Drivers page
   - Click "AI Call" button
   - Call will be initiated via Tata SmartFlo!

## 💰 Pricing

- **Setup Cost**: Low/Free
- **Per Minute**: ₹0.50-1.00 (varies by plan)
- **Best For**: Enterprise customers, reliable service

## 📖 Additional Resources

- [Tata SmartFlo API Documentation](https://docs.smartflo.tatatelebusiness.com/reference/v1click_to_call)
- [Webhook Documentation](https://docs.smartflo.tatatelebusiness.com/docs/webhook)
- [SmartFlo Dashboard](https://smartflo.tatatelebusiness.com)

## ✅ Verification

To verify your setup:

1. Check credentials are loaded:
   ```bash
   # In your app, check Settings/Integrations
   # Should show "Tata Telebusiness" as available provider
   ```

2. Test call initiation:
   - Make a test call from Drivers page
   - Check browser console for API response
   - Verify webhook receives events

3. Check webhook logs:
   - Monitor `/api/self-hosted-voice/webhook` endpoint
   - Should receive events from Tata SmartFlo

## 🎉 You're Ready!

Your AI voice agent is now configured with **Tata Telebusiness SmartFlo**!

The integration handles:
- ✅ Automatic call initiation
- ✅ Webhook event processing
- ✅ Call status updates
- ✅ Recording URL retrieval
- ✅ Transcript generation
- ✅ Cost tracking



