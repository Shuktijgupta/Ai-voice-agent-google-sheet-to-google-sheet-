# Deployment Guide - AI Voice Agent

This guide covers deploying the AI Voice Agent CRM to production.

## Prerequisites

- Node.js 18+ installed
- A Bland AI account with API key
- (Optional) Google Cloud account for Sheets integration
- A hosting platform (Vercel, Railway, Render, etc.)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Yes* | Your deployed URL (for webhooks) |
| **AI Voice Providers (at least one):** | | |
| `BLAND_API_KEY` | No | Your Bland AI API key |
| `ELEVENLABS_API_KEY` | No | Your ElevenLabs API key |
| `ELEVENLABS_AGENT_ID` | No | Your ElevenLabs Conversational AI agent ID |
| **Bolna Local AI (optional):** | | |
| `BOLNA_SERVER_URL` | No | URL to your Bolna server (e.g., http://localhost:5001) |
| `BOLNA_API_KEY` | No | API key for Bolna server (if secured) |
| `BOLNA_LLM_PROVIDER` | No | LLM provider: ollama, openai, groq, together, deepseek |
| `BOLNA_LLM_MODEL` | No | Model name (e.g., llama3.2, gpt-4o-mini) |
| `BOLNA_TTS_PROVIDER` | No | TTS provider: xtts, elevenlabs, openai, polly |
| `BOLNA_ASR_PROVIDER` | No | ASR provider: deepgram, whisper |
| `BOLNA_TELEPHONY_PROVIDER` | No | Telephony: twilio, plivo |
| **Click-to-Call (optional):** | | |
| `TATA_API_KEY` | No | Tata Communications API key |
| `TATA_VIRTUAL_NUMBER` | No | Virtual number for click-to-call |
| `TATA_AGENT_NUMBER` | No | Agent's phone number |
| **Google Sheets (optional):** | | |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | No | Service account email |
| `GOOGLE_SHEETS_PRIVATE_KEY` | No | Service account private key |
| `GOOGLE_SHEETS_ID` | No | Spreadsheet ID |

*Required for AI webhooks to work

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Build & Start

```bash
npm run build
npm start
```

---

## Platform-Specific Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Project Settings
4. Deploy automatically

**Build Command:** `npm run build`
**Output Directory:** `.next`

### Railway

1. Connect GitHub repository
2. Add environment variables
3. Railway auto-detects Next.js

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: `npm run build`
4. Set start command: `npm start`

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Database Options

### SQLite (Development)

```env
DATABASE_URL="file:./dev.db"
```

Good for: Local development, small deployments

### PostgreSQL (Production)

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?connection_limit=5&pool_timeout=10"
```

Recommended providers:
- [Neon](https://neon.tech) - Free tier available
- [Supabase](https://supabase.com) - Free tier available
- [Railway](https://railway.app) - PostgreSQL add-on

To migrate from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

---

## Bland AI Webhook Setup

For call status updates to work automatically:

1. Set `NEXT_PUBLIC_APP_URL` to your HTTPS domain
2. Bland AI will send webhooks to: `https://your-domain.com/api/bland/webhook`

**Note:** Webhooks only work with HTTPS URLs. On localhost, use the manual "Sync" button.

---

## Google Sheets Integration

### Setup Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Sheets API
4. Create a Service Account
5. Download JSON credentials
6. Share your spreadsheet with the service account email

### Expected Sheet Format

| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|----------|----------|----------|----------|----------|----------|----------|
| Name | Phone | Email | Status | Call Status | Call ID | Notes |

---

## Performance Optimization

### Recommended Settings

1. **Connection Pooling**: Add to PostgreSQL URL:
   ```
   ?connection_limit=5&pool_timeout=10
   ```

2. **Caching**: Stats API caches for 10 seconds automatically

3. **Image Optimization**: Next.js optimizes images automatically

### Resource Requirements

- **Minimum**: 512MB RAM, 1 vCPU
- **Recommended**: 1GB RAM, 1 vCPU

---

## Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Use HTTPS in production
- [ ] Set `NODE_ENV=production`
- [ ] Never commit `.env` file
- [ ] Rotate API keys periodically

---

## Troubleshooting

### "Prisma Client not found"

```bash
npx prisma generate
```

### "Database connection failed"

- Check `DATABASE_URL` format
- Ensure database server is running
- Verify network access/firewall rules

### "Bland API error"

- Verify `BLAND_API_KEY` is correct
- Check account has sufficient credits
- Phone numbers must include country code

### "Google Sheets error"

- Verify service account has access to sheet
- Check private key format (newlines as `\n`)
- Ensure API is enabled in Google Cloud

---

## Monitoring

### Health Check Endpoint

```
GET /api/stats
```

Returns 200 if application is healthy.

### Logs

- Development: Console output
- Production: Check your hosting platform's logs

---

## Support

For issues, create a GitHub issue with:
1. Error message
2. Steps to reproduce
3. Environment (OS, Node version, hosting platform)

