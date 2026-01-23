# SMS Integration - Quick Reference

## Environment Setup
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sms/send` | Yes | Send single SMS |
| POST | `/sms/send-bulk` | Yes | Send bulk SMS |
| POST | `/sms/test` | Yes | Test configuration |
| GET | `/sms/status` | Yes | Check service status |
| POST | `/sms/webhook` | No | Twilio webhook |

## Service Methods

```typescript
// Inject service
constructor(private readonly smsService: SmsService) {}

// Send single SMS
await this.smsService.sendSms('+15551234567', 'Your message');

// Send appointment confirmation
await this.smsService.sendAppointmentConfirmation(
  appointment,
  customer
);

// Send appointment reminder
await this.smsService.sendAppointmentReminder(
  appointment,
  customer
);

// Send bulk SMS
await this.smsService.sendBulkSms(
  ['+15551234567', '+15559876543'],
  'Bulk message'
);

// Check if configured
if (this.smsService.isServiceConfigured()) {
  // Send SMS
}
```

## Scheduled Tasks

| Task | Schedule | Window | Purpose |
|------|----------|--------|---------|
| 24-hour reminders | Every hour | 24-25 hrs ahead | Advance notice |
| 1-hour reminders | Every 30 min | 60-90 min ahead | Last-minute reminder |

## File Locations

```
/home/ubuntu/smart-business-assistant/apps/api/src/modules/sms/
├── dto/send-sms.dto.ts              # Request DTOs
├── sms.module.ts                     # Module
├── sms.service.ts                    # Core service
├── sms.controller.ts                 # Endpoints
├── sms-scheduler.service.ts          # Cron jobs
└── SMS_INTEGRATION.md                # Full docs
```

## cURL Examples

### Send SMS
```bash
curl -X POST http://localhost:3001/sms/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"to": "+15551234567", "message": "Hello!"}'
```

### Send Bulk
```bash
curl -X POST http://localhost:3001/sms/send-bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"recipients": ["+1555..."], "message": "Bulk!"}'
```

### Test
```bash
curl -X POST http://localhost:3001/sms/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"to": "+15551234567"}'
```

### Status
```bash
curl http://localhost:3001/sms/status \
  -H "Authorization: Bearer TOKEN"
```

## Response Examples

### Success
```json
{
  "success": true,
  "sid": "SM1234567890abcdef",
  "status": "queued",
  "to": "+15551234567"
}
```

### Not Configured
```json
{
  "statusCode": 400,
  "message": "SMS service is not configured...",
  "error": "Bad Request"
}
```

## Phone Number Format
Always use E.164 format:
- US: `+15551234567`
- UK: `+447911123456`
- No spaces, dashes, or parentheses

## Import in Other Modules

```typescript
// In your module
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
})
export class YourModule {}

// In your service
import { SmsService } from '../sms/sms.service';

@Injectable()
export class YourService {
  constructor(private sms: SmsService) {}
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "SMS service is not configured" | Add env vars to .env |
| "Invalid phone number" | Use E.164 format (+1...) |
| Reminders not sending | Check scheduler logs |
| Build errors | Run `pnpm run build` |

## Dependencies
- `twilio@^5.12.0`
- `@nestjs/schedule@^6.1.0`
