# API Documentation - Student Events Platform

## Base URL
`/api/v1`

## Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <access_token>
```

---

## 1. Auth Module

### POST `/auth/register`
Register new user (student or organizer)

**Request Body:**
```json
{
  "login": "string (unique)",
  "email": "string (unique, valid email)",
  "password": "string (min 8 chars)",
  "role": "student | organizer",
  "profile": {
    // For student:
    "firstName": "string",
    "lastName": "string",
    "birthDate": "YYYY-MM-DD",
    "phone": "string",
    "instituteId": "number",
    "group": "string",
    "yearOfStudy": "number (1-6)",
    
    // For organizer:
    "organizationName": "string",
    "organizationDescription": "string",
    "contacts": "string",
    "position": "string (optional)"
  }
}
```

**Response (201):**
```json
{
  "userId": "uuid",
  "message": "Registration successful. Please verify your email."
}
```

---

### POST `/auth/login`
Login user

**Request Body:**
```json
{
  "login": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "accessToken": "string (JWT, 15 min TTL)",
  "refreshToken": "string (7 days TTL)",
  "user": {
    "id": "uuid",
    "login": "string",
    "email": "string",
    "role": "student | organizer | admin",
    "status": "active | blocked"
  }
}
```

---

### POST `/auth/logout`
Logout user (invalidate refresh token)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST `/auth/refresh`
Refresh access token

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200):**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

---

### POST `/auth/forgot-password`
Request password reset

**Request Body:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "message": "If email exists, reset link has been sent"
}
```

---

### POST `/auth/reset-password`
Reset password with token

**Request Body:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

## 2. Users Module

### GET `/users/me`
Get current user profile

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "login": "string",
  "email": "string",
  "role": "student | organizer | admin",
  "status": "active | blocked",
  "createdAt": "ISO8601",
  "profile": {
    // Student profile
    "firstName": "string",
    "lastName": "string",
    "birthDate": "YYYY-MM-DD",
    "phone": "string",
    "avatarUrl": "string | null",
    "institute": {
      "id": "number",
      "name": "string",
      "code": "string"
    },
    "group": "string",
    "yearOfStudy": "number",
    "status": "studying | graduated | expelled"
    
    // OR Organizer profile
    "organizationName": "string",
    "organizationDescription": "string",
    "contacts": "string",
    "position": "string"
  }
}
```

---

### PUT `/users/me`
Update current user profile

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "phone": "string (optional)",
  "avatarUrl": "string (optional)",
  
  // For organizers only
  "organizationDescription": "string (optional)",
  "contacts": "string (optional)"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "profile": { /* updated profile */ }
}
```

---

### GET `/users/:id`
Get user public profile (for viewing by others)

**Response (200):**
```json
{
  "id": "uuid",
  "role": "student | organizer",
  "profile": {
    "firstName": "string",
    "lastName": "string",
    "avatarUrl": "string | null",
    "institute": "string (if student)",
    "organizationName": "string (if organizer)"
  }
}
```

---

## 3. Events Module

### GET `/events`
Get events list with filtering and pagination

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `type` (string, optional)
- `instituteId` (number, optional)
- `status` (string: draft | moderated | published | completed | cancelled)
- `dateFrom` (YYYY-MM-DD, default: today)
- `dateTo` (YYYY-MM-DD, optional)
- `search` (string, search in name/description)
- `sortBy` (string: date | name | createdAt, default: date)
- `sortOrder` (asc | desc, default: asc)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "type": "string",
      "organizer": {
        "id": "uuid",
        "organizationName": "string"
      },
      "datetime": "ISO8601",
      "address": "string",
      "coordinates": {
        "lat": "decimal(9,6)",
        "lng": "decimal(9,6)"
      },
      "description": "string",
      "limit": "number | null",
      "registeredCount": "number",
      "status": "published | completed | cancelled",
      "imageUrl": "string | null",
      "instituteId": "number | null"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

---

### GET `/events/:id`
Get single event details

**Response (200):**
```json
{
  "id": "uuid",
  "name": "string",
  "type": "string",
  "organizer": {
    "id": "uuid",
    "organizationName": "string",
    "contacts": "string",
    "chatLink": "string | null"
  },
  "datetime": "ISO8601",
  "address": "string",
  "coordinates": {
    "lat": "decimal(9,6)",
    "lng": "decimal(9,6)"
  },
  "description": "string",
  "limit": "number | null",
  "registeredCount": "number",
  "status": "published | completed | cancelled",
  "images": [
    {
      "url": "string",
      "order": "number"
    }
  ],
  "instituteId": "number | null",
  "registrationDeadline": "ISO8601 | null",
  "isRegistered": "boolean (current user)",
  "isCheckedIn": "boolean (current user)"
}
```

---

### POST `/events`
Create new event (Organizer only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string",
  "type": "string",
  "datetime": "ISO8601",
  "address": "string",
  "coordinates": {
    "lat": "decimal(9,6)",
    "lng": "decimal(9,6)"
  },
  "description": "string",
  "limit": "number | null",
  "instituteId": "number | null",
  "registrationDeadline": "ISO8601 | null",
  "contacts": "string (optional, overrides organizer default)",
  "chatLink": "string | null"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "message": "Event created and sent for moderation",
  "status": "moderated"
}
```

---

### PUT `/events/:id`
Update event (Organizer, owner only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (same as POST, all fields optional)

**Response (200):**
```json
{
  "message": "Event updated successfully",
  "event": { /* updated event */ }
}
```

---

### DELETE `/events/:id`
Delete event (Organizer, owner only)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

---

### POST `/events/:id/images`
Upload event images (Organizer, owner only)

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Request Body:**
- `files`: array of image files

**Response (201):**
```json
{
  "images": [
    {
      "url": "string",
      "order": "number"
    }
  ]
}
```

---

## 4. Registration Module

### POST `/events/:id/register`
Register for event (Student only)

**Headers:** `Authorization: Bearer <token>`

**Response (201):**
```json
{
  "message": "Successfully registered",
  "registration": {
    "id": "uuid",
    "status": "registered",
    "registeredAt": "ISO8601"
  }
}
```

---

### DELETE `/events/:id/register`
Cancel registration (Student, before deadline)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Registration cancelled successfully"
}
```

---

### GET `/events/:id/attendees`
Get event attendees list (Organizer, owner only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (registered | checked_in)
- `page` (number)
- `limit` (number)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "firstName": "string",
        "lastName": "string",
        "group": "string",
        "institute": "string"
      },
      "registeredAt": "ISO8601",
      "checkedInAt": "ISO8601 | null",
      "status": "registered | checked_in"
    }
  ],
  "pagination": { /* ... */ }
}
```

---

## 5. Attendance Module

### POST `/attendance/generate-qr`
Generate dynamic QR code for check-in (Organizer, owner only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "eventId": "uuid"
}
```

**Response (200):**
```json
{
  "qrToken": "string (updates every 30 sec)",
  "expiresAt": "ISO8601"
}
```

---

### POST `/attendance/check`
Check-in attendee by scanning QR (Student)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "eventId": "uuid",
  "qrToken": "string"
}
```

**Response (200):**
```json
{
  "message": "Check-in successful",
  "checkedInAt": "ISO8601"
}
```

---

## 6. Admin Module

### GET `/admin/moderation`
Get events queue for moderation (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (moderated, default)
- `page`, `limit`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "organizer": {
        "organizationName": "string"
      },
      "createdAt": "ISO8601",
      "status": "moderated"
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### PUT `/admin/events/:id/moderate`
Approve/reject event (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "action": "approve | reject",
  "rejectionReason": "string (if reject)"
}
```

**Response (200):**
```json
{
  "message": "Event approved/rejected",
  "status": "published | rejected"
}
```

---

### GET `/admin/users`
Get all users (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `role`, `status`, `search`, `page`, `limit`

**Response (200):**
```json
{
  "data": [ /* users list */ ],
  "pagination": { /* ... */ }
}
```

---

### PUT `/admin/users/:id`
Update user (block, change role) (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "active | blocked",
  "role": "student | organizer | admin"
}
```

**Response (200):**
```json
{
  "message": "User updated successfully"
}
```

---

### GET `/admin/analytics`
Get global analytics (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `period` (day | week | month | year)
- `instituteId` (optional)

**Response (200):**
```json
{
  "eventsTotal": "number",
  "eventsByType": [ { "type": "string", "count": "number" } ],
  "attendanceRate": "number (0-100)",
  "activeUsers": "number",
  "registrationsByInstitute": [ { "institute": "string", "count": "number" } ],
  "topEvents": [ { "eventId": "uuid", "name": "string", "attendees": "number" } ]
}
```

---

### GET `/admin/analytics/export`
Export analytics report (Admin only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (csv | pdf)
- `period`, `instituteId`

**Response:** File download

---

## 7. References Module

### GET `/references/institutes`
Get institutes dictionary

**Response (200):**
```json
{
  "institutes": [
    {
      "id": "number",
      "name": "string",
      "code": "string",
      "isActive": "boolean"
    }
  ]
}
```

---

### GET `/references/event-types`
Get event types dictionary

**Response (200):**
```json
{
  "types": [
    {
      "id": "string",
      "name": "string"
    }
  ]
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "statusCode": "number",
  "message": "string",
  "error": "string",
  "details": [ /* validation errors */ ] (optional)
}
```

### Common Status Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate, already registered)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error
