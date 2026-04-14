# Backend Architecture (NestJS Modular)

backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   │
│   ├── modules/                # Feature modules
│   │   ├── auth/               # Authentication & Authorization
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/     # JWT strategies
│   │   │   ├── guards/         # Auth guards
│   │   │   ├── decorators/     # Custom decorators (@Roles, @CurrentUser)
│   │   │   └── dto/            # LoginDto, RegisterDto, RefreshTokenDto
│   │   │
│   │   ├── users/              # User management
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   ├── entities/       # User entity
│   │   │   └── dto/            # CreateUserDto, UpdateUserDto
│   │   │
│   │   ├── student-profiles/   # Student profiles
│   │   │   ├── student-profiles.controller.ts
│   │   │   ├── student-profiles.service.ts
│   │   │   ├── student-profiles.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── organizer-profiles/ # Organizer profiles
│   │   │   ├── organizer-profiles.controller.ts
│   │   │   ├── organizer-profiles.service.ts
│   │   │   ├── organizer-profiles.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── events/             # Events CRUD
│   │   │   ├── events.controller.ts
│   │   │   ├── events.service.ts
│   │   │   ├── events.module.ts
│   │   │   ├── entities/
│   │   │   └── dto/
│   │   │
│   │   ├── registration/       # RSVP management
│   │   │   ├── registration.controller.ts
│   │   │   ├── registration.service.ts
│   │   │   ├── registration.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── attendance/         # Check-in / QR scanning
│   │   │   ├── attendance.controller.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── attendance.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── certificates/       # Certificate management
│   │   │   ├── certificates.controller.ts
│   │   │   ├── certificates.service.ts
│   │   │   ├── certificates.module.ts
│   │   │   └── dto/
│   │   │
│   │   ├── admin/              # Admin panel
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── admin.module.ts
│   │   │   └── dto/
│   │   │
│   │   └── references/         # Reference data (institutes, event types)
│   │       ├── references.controller.ts
│   │       ├── references.service.ts
│   │       └── references.module.ts
│   │
│   ├── common/                 # Shared code
│   │   ├── filters/            # Exception filters
│   │   ├── interceptors/       # Response transformers
│   │   ├── guards/             # Shared guards (RBAC)
│   │   ├── pipes/              # Validation pipes
│   │   ├── decorators/         # Shared decorators
│   │   └── interfaces/         # Shared interfaces
│   │
│   └── config/                 # Configuration
│       ├── database.config.ts
│       ├── redis.config.ts
│       ├── jwt.config.ts
│       └── app.config.ts
│
├── prisma/
│   └── schema.prisma           # Database schema (moved from root)
│
├── test/                       # E2E tests
│   ├── jest-e2e.json
│   └── app.e2e-spec.ts
│
├── nest-cli.json
├── tsconfig.json
└── package.json

## Key Components

### Security
- **Helmet**: Secure HTTP headers
- **Throttler**: Rate limiting (IP + user based)
- **Class Validator**: Input validation
- **Bcrypt**: Password hashing

### Data Layer
- **Prisma ORM**: Type-safe database access
- **PostgreSQL**: Primary database
- **Redis**: Caching, sessions, queues

### Queues (BullMQ)
- Email notifications
- Push notifications
- Certificate generation
- Analytics aggregation

### API Documentation
- **Swagger/OpenAPI**: Auto-generated at `/api/docs`

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/student_events"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# App
PORT=4000
NODE_ENV=development
```
