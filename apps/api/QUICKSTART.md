# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- PostgreSQL 14+ running
- (Optional) Docker for containerized PostgreSQL

## 1. Install Dependencies

```bash
cd /home/ubuntu/smart-business-assistant/apps/api
pnpm install
```

## 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:

```env
# Database - Update with your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/smart_business_assistant?schema=public"

# JWT - Generate a secure secret (use: openssl rand -base64 32)
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# Optional: Integration credentials (can be added later)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

VAPI_API_KEY=""
VAPI_PHONE_NUMBER=""

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
```

## 3. Set Up Database

### Option A: Local PostgreSQL

```bash
# Create database
createdb smart_business_assistant

# Or using psql
psql -U postgres -c "CREATE DATABASE smart_business_assistant;"
```

### Option B: Docker PostgreSQL

```bash
docker run --name smart-business-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=smart_business_assistant \
  -p 5432:5432 \
  -d postgres:14
```

## 4. Run Prisma Migrations

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations (creates all tables)
pnpm prisma:migrate

# (Optional) Open Prisma Studio to view database
pnpm prisma:studio
```

## 5. Start Development Server

```bash
pnpm dev
```

The API will be available at: `http://localhost:3000`

## 6. Verify Installation

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T00:00:00.000Z",
  "uptime": 12.345,
  "environment": "development"
}
```

### Test Registration (TODO: Implement auth first)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepassword",
    "name": "Admin User",
    "tenantName": "Example Business",
    "tenantPhone": "+1234567890"
  }'
```

## Project Structure Overview

```
/home/ubuntu/smart-business-assistant/apps/api/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── common/              # Shared utilities
│   ├── config/              # Configuration (Prisma, etc.)
│   └── modules/             # Feature modules
│       ├── auth/            # Authentication
│       ├── tenants/         # Tenant management
│       ├── customers/       # Customer CRUD
│       ├── appointments/    # Scheduling
│       ├── quotes/          # Quotes/Estimates
│       ├── invoices/        # Invoice management
│       ├── voice/           # Vapi.ai integration
│       ├── sms/             # Twilio integration
│       └── payments/        # Stripe integration
├── prisma/
│   └── schema.prisma        # Database schema
├── dist/                    # Compiled output
└── package.json             # Dependencies and scripts
```

## Common Commands

### Development
```bash
pnpm dev              # Start with hot reload
pnpm build            # Compile TypeScript
pnpm start            # Run production build
```

### Database
```bash
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # Open database GUI
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:watch       # Run in watch mode
pnpm test:cov         # Generate coverage report
```

## Development Workflow

### Adding a New Endpoint

1. **Create DTO** (if needed)
```typescript
// src/modules/customers/dto/create-customer.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  phone: string;
}
```

2. **Add Service Method**
```typescript
// src/modules/customers/customers.service.ts
async create(data: CreateCustomerDto, tenantId: string) {
  return this.prisma.customer.create({
    data: {
      ...data,
      tenantId,
    },
  });
}
```

3. **Add Controller Endpoint**
```typescript
// src/modules/customers/customers.controller.ts
@Post()
async create(
  @Body() createDto: CreateCustomerDto,
  @CurrentUser() user: CurrentUserPayload,
) {
  return this.customersService.create(createDto, user.tenantId);
}
```

4. **Test the Endpoint**
```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection with psql
psql "postgresql://user:password@localhost:5432/smart_business_assistant"

# Verify DATABASE_URL in .env matches your setup
```

### Port Already in Use

```bash
# Change PORT in .env file
PORT=3001

# Or find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### Prisma Client Not Found

```bash
# Regenerate Prisma client
pnpm prisma:generate

# Rebuild application
pnpm build
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

## Next Steps

1. **Implement Authentication**
   - Add bcrypt password hashing
   - Complete register/login logic
   - Add refresh token support

2. **Add Request Validation**
   - Create DTOs for all endpoints
   - Add validation decorators

3. **Integrate External Services**
   - Set up Vapi.ai for voice calls
   - Configure Twilio for SMS
   - Connect Stripe for payments

4. **Write Tests**
   - Unit tests for all services
   - E2E tests for critical flows
   - Integration tests for external APIs

5. **Add Documentation**
   - Swagger/OpenAPI documentation
   - Postman collection
   - API usage examples

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vapi.ai Documentation](https://docs.vapi.ai/)
- [Twilio Documentation](https://www.twilio.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

## Support

For issues or questions:
- Check `ARCHITECTURE.md` for system design details
- Check `SETUP_COMPLETE.md` for setup information
- Review `README.md` for API endpoint documentation

## License

Private project - All rights reserved
