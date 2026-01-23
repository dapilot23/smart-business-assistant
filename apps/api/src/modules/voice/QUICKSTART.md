# Vapi.ai Integration - Quick Start

## 5-Minute Setup

### Step 1: Get Vapi API Key
1. Sign up at [vapi.ai](https://vapi.ai)
2. Go to Dashboard → Settings → API Keys
3. Create new API key

### Step 2: Configure Environment
```bash
# Edit .env file
echo "VAPI_API_KEY=your_api_key_here" >> .env
```

### Step 3: Restart API Server
```bash
pnpm dev
```

Look for: `Vapi.ai integration initialized` in logs

### Step 4: Test the Integration

#### Create an Assistant (Optional)
```bash
curl -X POST http://localhost:3001/voice/assistant \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Assistant",
    "firstMessage": "Hi! This is a test."
  }'
```

#### Make a Test Call
```bash
curl -X POST http://localhost:3001/voice/call/outbound \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Hello, this is a test call"
  }'
```

#### View Call Logs
```bash
curl http://localhost:3001/voice/calls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 5: Configure Webhooks in Vapi Dashboard

1. Go to Vapi Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/voice/webhook`
3. Enable events:
   - Call started
   - Call ended
   - Function call
   - Status update

### Step 6: Customize for Your Business

Edit `/src/modules/voice/voice.service.ts`:

```typescript
private getDefaultSystemPrompt(): string {
  return `You are a helpful AI assistant for [YOUR BUSINESS NAME].

  Your responsibilities:
  - Answer questions about our services
  - Help book appointments
  - Provide pricing information
  - Transfer urgent calls to staff

  Our services include:
  - [Service 1]
  - [Service 2]
  - [Service 3]

  Our hours: [BUSINESS HOURS]

  Be friendly, professional, and helpful.`;
}
```

## Common Use Cases

### Appointment Booking Bot
```typescript
// The AI will call this function when customer wants to book
private async handleBookAppointment(params: any, callData: any) {
  const { date, time, service, customerPhone } = params;

  // Your booking logic here
  const appointment = await this.prisma.appointment.create({
    data: {
      scheduledAt: new Date(`${date}T${time}`),
      // ... other fields
    },
  });

  return {
    result: `Great! Your appointment is booked for ${date} at ${time}.`
  };
}
```

### Customer Support Bot
```typescript
private getDefaultSystemPrompt(): string {
  return `You are a customer support AI for [COMPANY].

  Common questions:
  - Hours: Mon-Fri 9am-5pm
  - Location: [ADDRESS]
  - Services: [LIST]
  - Pricing: [PRICING INFO]

  If customer needs help beyond your knowledge, transfer to human.`;
}
```

### Reminder Calls
```typescript
// Send appointment reminders
async sendReminder(appointmentId: string) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true },
  });

  return this.makeOutboundCall({
    phoneNumber: appointment.customer.phone,
    message: `Hi ${appointment.customer.name}! This is a reminder
              about your appointment tomorrow at 2pm.`,
  }, appointment.tenantId);
}
```

## Testing Without Real Calls

Vapi provides test phone numbers. Check their docs for current test numbers.

Or use webhook testing:

```bash
# Simulate incoming call webhook
curl -X POST http://localhost:3001/voice/webhook/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-call-123",
    "customer": { "number": "+1234567890" },
    "metadata": { "tenantId": "your-tenant-id" }
  }'
```

## Troubleshooting

### "Vapi.ai not configured" error
- Check `VAPI_API_KEY` is set in `.env`
- Restart the API server
- Verify API key is valid in Vapi dashboard

### Webhooks not working
- Ensure URL is publicly accessible (not localhost)
- Use ngrok for local testing: `ngrok http 3001`
- Check webhook URL in Vapi dashboard
- Verify `@Public()` decorator on endpoints

### Calls failing
- Phone numbers must be in E.164 format: `+1234567890`
- Check Vapi account has credits
- Review Vapi dashboard logs
- Ensure assistant is created

## Next Steps

1. ✅ Basic setup complete
2. 📝 Customize system prompts
3. 🔧 Implement booking logic
4. 🎯 Test with real calls
5. 📊 Monitor call analytics
6. 🚀 Deploy to production

## Resources

- [Full Documentation](./README.md)
- [Vapi Documentation](https://docs.vapi.ai)
- [Vapi Dashboard](https://dashboard.vapi.ai)
- [GitHub Issues](https://github.com/VapiAI/server-sdk-typescript/issues)

## Support

For integration issues:
- Check logs: `pnpm dev` output
- Review `/voice/calls` endpoint for call history
- Test webhooks with curl
- Check Vapi dashboard for API errors
