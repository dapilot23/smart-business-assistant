# Twilio SMS Integration Documentation

## Overview
Complete Twilio SMS integration for the Smart Business Assistant API with support for single SMS, bulk SMS, appointment confirmations, reminders, and scheduled notifications.

## Features
- Single SMS sending
- Bulk SMS sending with result tracking
- Appointment confirmation messages
- Appointment reminder messages
- Automated scheduled reminders (24-hour and 1-hour)
- Configuration validation
- Graceful error handling when Twilio is not configured

## Environment Variables
Required environment variables in `.env`:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## API Endpoints

### 1. Send Single SMS
**Endpoint:** `POST /sms/send`

**Request Body:**
```json
{
  "to": "+15551234567",
  "message": "Your custom message here"
}
```

**Response:**
```json
{
  "success": true,
  "sid": "SM1234567890abcdef",
  "status": "queued",
  "to": "+15551234567"
}
```

### 2. Send Bulk SMS
**Endpoint:** `POST /sms/send-bulk`

**Request Body:**
```json
{
  "recipients": ["+15551234567", "+15559876543"],
  "message": "Bulk message to all recipients"
}
```

**Response:**
```json
{
  "success": 2,
  "failed": 0,
  "results": [
    {
      "recipient": "+15551234567",
      "success": true,
      "sid": "SM1234567890abcdef",
      "status": "queued"
    },
    {
      "recipient": "+15559876543",
      "success": true,
      "sid": "SM0987654321fedcba",
      "status": "queued"
    }
  ]
}
```

### 3. Test SMS Configuration
**Endpoint:** `POST /sms/test`

**Request Body:**
```json
{
  "to": "+15551234567",
  "message": "Optional custom test message"
}
```

**Response:**
```json
{
  "success": true,
  "sid": "SM1234567890abcdef",
  "status": "queued",
  "to": "+15551234567"
}
```

### 4. Check SMS Service Status
**Endpoint:** `GET /sms/status`

**Response (Configured):**
```json
{
  "configured": true,
  "message": "SMS service is configured and ready"
}
```

**Response (Not Configured):**
```json
{
  "configured": false,
  "message": "SMS service is not configured. Please set environment variables."
}
```

### 5. Twilio Webhook Handler
**Endpoint:** `POST /sms/webhook` (Public - No Authentication Required)

This endpoint receives delivery status updates from Twilio. Configure in your Twilio dashboard:
- Webhook URL: `https://your-domain.com/sms/webhook`
- Method: POST

## Service Methods

### SmsService

#### `sendSms(to: string, message: string)`
Send a single SMS message to a recipient.

```typescript
await smsService.sendSms('+15551234567', 'Hello from SBA!');
```

#### `sendAppointmentConfirmation(appointment, customer)`
Send appointment confirmation with formatted date/time.

```typescript
const appointment = {
  id: 'apt_123',
  scheduledAt: new Date('2026-01-24T14:00:00Z'),
  duration: 60,
  service: { name: 'HVAC Maintenance' }
};

const customer = {
  name: 'John Doe',
  phone: '+15551234567'
};

await smsService.sendAppointmentConfirmation(appointment, customer);
```

**Example Message:**
```
Hi John Doe! Your HVAC Maintenance appointment is confirmed for Friday, January 24, 2026 at 2:00 PM. We look forward to seeing you!
```

#### `sendAppointmentReminder(appointment, customer)`
Send appointment reminder for the same day.

```typescript
await smsService.sendAppointmentReminder(appointment, customer);
```

**Example Message:**
```
Reminder: You have a HVAC Maintenance scheduled today at 2:00 PM. See you soon!
```

#### `sendBulkSms(recipients: string[], message: string)`
Send the same message to multiple recipients.

```typescript
const recipients = ['+15551234567', '+15559876543'];
const message = 'Special offer: 20% off all services this week!';

const result = await smsService.sendBulkSms(recipients, message);
// result: { success: 2, failed: 0, results: [...] }
```

#### `isServiceConfigured(): boolean`
Check if Twilio credentials are configured.

```typescript
if (smsService.isServiceConfigured()) {
  // SMS functionality is available
}
```

## Scheduled Tasks

### SmsSchedulerService

The scheduler service automatically sends appointment reminders:

#### 24-Hour Reminders
- **Schedule:** Every hour (using cron)
- **Target:** Appointments scheduled 24-25 hours from now
- **Status Filter:** SCHEDULED or CONFIRMED appointments only

#### 1-Hour Reminders
- **Schedule:** Every 30 minutes (using cron)
- **Target:** Appointments scheduled 60-90 minutes from now
- **Status Filter:** SCHEDULED or CONFIRMED appointments only

### Customizing Schedule

Edit `/src/modules/sms/sms-scheduler.service.ts`:

```typescript
// Change from every hour to every 2 hours
@Cron('0 */2 * * *')
async send24HourReminders() { ... }

// Change from every 30 min to every 15 min
@Cron(CronExpression.EVERY_15_MINUTES)
async send1HourReminders() { ... }
```

## Error Handling

### When Twilio is Not Configured
If environment variables are not set, the service will:
1. Log a warning on startup
2. Return `false` for `isServiceConfigured()`
3. Throw `BadRequestException` when attempting to send SMS
4. Skip scheduled reminders

### API Error Response Example
```json
{
  "statusCode": 400,
  "message": "SMS service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
  "error": "Bad Request"
}
```

## Usage in Other Modules

To use SMS functionality in other modules:

1. Import SmsModule in your module:
```typescript
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  // ...
})
export class YourModule {}
```

2. Inject SmsService:
```typescript
import { SmsService } from '../sms/sms.service';

@Injectable()
export class YourService {
  constructor(private readonly smsService: SmsService) {}

  async notifyCustomer(phone: string, message: string) {
    if (this.smsService.isServiceConfigured()) {
      await this.smsService.sendSms(phone, message);
    }
  }
}
```

## Testing

### Manual Testing with cURL

**Send SMS:**
```bash
curl -X POST http://localhost:3001/sms/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "+15551234567",
    "message": "Test message"
  }'
```

**Check Status:**
```bash
curl http://localhost:3001/sms/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Configuration:**
```bash
curl -X POST http://localhost:3001/sms/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "+15551234567"
  }'
```

## Architecture

```
sms/
├── dto/
│   └── send-sms.dto.ts          # DTOs for validation
├── sms.module.ts                 # Module registration
├── sms.service.ts                # Core SMS logic
├── sms.controller.ts             # HTTP endpoints
├── sms-scheduler.service.ts      # Automated reminders
└── SMS_INTEGRATION.md            # This file
```

## Dependencies
- `twilio` - Twilio Node.js SDK
- `@nestjs/schedule` - Cron job scheduling
- `@nestjs/config` - Environment variables

## Security Considerations

1. **Environment Variables:** Never commit `.env` file with real credentials
2. **Webhook Validation:** Consider implementing Twilio signature validation
3. **Rate Limiting:** Implement rate limiting on SMS endpoints
4. **Phone Number Validation:** Validate phone numbers before sending
5. **Authentication:** All endpoints except webhook require authentication

## Cost Management

### Tips to Reduce SMS Costs:
1. Implement opt-in/opt-out functionality
2. Batch reminders during off-peak hours
3. Allow users to configure reminder preferences
4. Set maximum daily SMS limits per tenant
5. Monitor usage through Twilio dashboard

## Troubleshooting

### SMS Not Sending
1. Verify environment variables are set correctly
2. Check Twilio account status and balance
3. Verify phone numbers are in E.164 format (+1234567890)
4. Check application logs for error details

### Scheduled Reminders Not Working
1. Verify ScheduleModule is registered in app.module.ts
2. Check that SmsSchedulerService is in providers array
3. Ensure application is running continuously
4. Check logs for scheduler execution

### Phone Number Format Issues
Always use E.164 format: `+[country code][number]`
- US: +15551234567
- UK: +447911123456
