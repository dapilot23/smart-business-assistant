# Voice AI Integration - Vapi.ai

This module integrates Vapi.ai voice AI capabilities into the Smart Business Assistant API, enabling AI-powered phone call handling for appointment booking and customer service.

## Features

- AI-powered inbound call handling
- Outbound call initiation
- Real-time call transcription
- Call logging and analytics
- Function calling for appointment booking
- Multi-tenant support

## Setup

### 1. Environment Configuration

Add your Vapi API key to `.env`:

```bash
VAPI_API_KEY=your_vapi_api_key_here
```

Get your API key from [Vapi.ai Dashboard](https://dashboard.vapi.ai)

### 2. Database Migration

The CallLog model is automatically created via Prisma migrations:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

## API Endpoints

### Protected Endpoints (Require Authentication)

#### Create AI Assistant
```http
POST /voice/assistant
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Business Assistant",
  "firstMessage": "Hello! How can I help you today?",
  "systemPrompt": "You are a helpful assistant...",
  "model": "gpt-4",
  "voice": "andrew"
}
```

#### Make Outbound Call
```http
POST /voice/call/outbound
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "message": "Custom greeting message",
  "assistantId": "optional-assistant-id",
  "metadata": {
    "customerId": "customer-123"
  }
}
```

#### Get Call Logs
```http
GET /voice/calls?limit=50
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "id": "call-log-id",
    "tenantId": "tenant-id",
    "vapiCallId": "vapi-call-id",
    "callerPhone": "+1234567890",
    "direction": "INBOUND",
    "status": "ENDED",
    "duration": 120,
    "transcript": "Full call transcript...",
    "summary": "Customer called about...",
    "createdAt": "2026-01-23T00:00:00Z"
  }
]
```

### Webhook Endpoints (Public - Called by Vapi)

Configure these webhook URLs in your Vapi dashboard:

#### Main Webhook Handler
```http
POST /voice/webhook
```

Handles all Vapi webhook events:
- `assistant-request` - Request for assistant configuration
- `status-update` - Call status changes
- `end-of-call-report` - Final call summary
- `function-call` - AI assistant function execution

#### Specific Webhook Handlers

```http
POST /voice/webhook/incoming      # New incoming call
POST /voice/webhook/status        # Call status updates
POST /voice/webhook/transcript    # Live transcript updates
POST /voice/webhook/function-call # Function call requests
```

## Function Calling

The AI assistant can call these functions during conversations:

### bookAppointment
Called when customer wants to book an appointment.

Parameters:
```json
{
  "date": "2026-01-25",
  "time": "14:00",
  "service": "Service name",
  "customerName": "John Doe",
  "customerPhone": "+1234567890"
}
```

### getBusinessInfo
Returns business information (hours, services, etc.)

### transferToHuman
Initiates transfer to human agent

## Configuration

### Default System Prompt

The AI assistant uses this default prompt:

```
You are a helpful AI assistant for a business. Your role is to:
1. Greet callers professionally
2. Help them book appointments
3. Provide business information
4. Transfer to a human when needed

Be friendly, concise, and professional. If you don't know something, offer to transfer to a human.
```

### Assistant Configuration

Customize assistant behavior:
- **Model**: GPT-4, GPT-3.5-turbo
- **Voice**: andrew, jennifer, etc. (Azure voices)
- **Transcriber**: Deepgram Nova-2
- **Language**: English (en)

## Call Lifecycle

1. **Incoming Call** → Webhook receives call data
2. **Call Start** → AI assistant greets caller
3. **Conversation** → Real-time transcription, function calls
4. **Call End** → Transcript saved, summary generated
5. **Database** → CallLog created with full details

## Error Handling

When Vapi is not configured (no API key), the service:
- Logs a warning on startup
- Throws `BadRequestException` when API calls are attempted
- Allows the application to run normally

## Multi-Tenant Support

Each call is associated with a tenant:
- Outbound calls use authenticated user's `tenantId`
- Incoming calls use `metadata.tenantId` from webhook
- Call logs are isolated per tenant

## Data Model

### CallLog Schema

```prisma
model CallLog {
  id          String        @id @default(cuid())
  tenantId    String
  vapiCallId  String        @unique
  callerPhone String
  direction   CallDirection @default(INBOUND)
  status      CallStatus    @default(QUEUED)
  duration    Int?          // seconds
  transcript  String?       @db.Text
  summary     String?
  metadata    Json?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum CallDirection {
  INBOUND
  OUTBOUND
}

enum CallStatus {
  QUEUED
  RINGING
  IN_PROGRESS
  FORWARDING
  ENDED
  FAILED
}
```

## Example Usage

### Create a Custom Assistant

```typescript
const assistant = await voiceService.createAssistant({
  name: 'Plumbing Service Assistant',
  firstMessage: 'Hello! Thank you for calling ABC Plumbing. How can I help you today?',
  systemPrompt: `You are an AI assistant for ABC Plumbing.
    - Help customers book appointments
    - Answer questions about services
    - Provide pricing information
    - Transfer urgent calls to on-call plumber`,
  model: 'gpt-4',
  voice: 'andrew',
});
```

### Make an Outbound Call

```typescript
const call = await voiceService.makeOutboundCall({
  phoneNumber: '+1234567890',
  message: 'Hi! This is a reminder about your appointment tomorrow at 2pm.',
  metadata: {
    appointmentId: 'appt-123',
    customerId: 'cust-456',
  }
}, tenantId);
```

## Best Practices

1. **Test with test phone numbers** before production
2. **Set up webhook URLs** in Vapi dashboard
3. **Monitor call logs** for quality assurance
4. **Customize system prompts** for your business
5. **Use metadata** to track call context
6. **Handle function calls** appropriately
7. **Implement human transfer** for complex issues

## Troubleshooting

### Webhooks not receiving data
- Verify webhook URLs in Vapi dashboard
- Check that endpoints are publicly accessible
- Ensure `@Public()` decorator is present

### Calls failing
- Verify VAPI_API_KEY is set correctly
- Check Vapi dashboard for error logs
- Ensure phone numbers are in E.164 format (+1234567890)

### Assistant not responding correctly
- Review system prompt
- Check function definitions
- Monitor Vapi dashboard logs

## Related Files

- `/src/modules/voice/voice.service.ts` - Core Vapi integration
- `/src/modules/voice/voice.controller.ts` - API endpoints
- `/src/modules/voice/dto/` - Request/response DTOs
- `/prisma/schema.prisma` - CallLog model definition

## Resources

- [Vapi.ai Documentation](https://docs.vapi.ai)
- [Vapi.ai Dashboard](https://dashboard.vapi.ai)
- [Server SDK](https://github.com/VapiAI/server-sdk-typescript)
