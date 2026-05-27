# Листинги программного кода

## Листинг 1 — Схема модели Registration (Prisma ORM)

```prisma
model Registration {
  id           String             @id @default(uuid())
  eventId      String
  event        Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId       String
  user         User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  status       RegistrationStatus @default(CONFIRMED)
  registeredAt DateTime           @default(now())
  cancelledAt  DateTime?

  qrToken      String?   @unique   // HMAC-подписанный токен для чек-ина
  checkedInAt  DateTime?
  checkInSource String?            // 'QR_SCAN', 'MANUAL'

  @@unique([eventId, userId])
  @@index([eventId, status])
  @@index([userId, status])
}
```

---

## Листинг 2 — Генерация и верификация HMAC-подписанного QR-токена (NestJS)

```typescript
// backend/src/modules/attendance/attendance.service.ts

const QR_SECRET = process.env.QR_SECRET ?? 'qr-fallback-secret';

static buildToken(payload: Record<string, any>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

static verifyToken(token: string): Record<string, any> | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', QR_SECRET)
    .update(data)
    .digest('hex');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
}
```

---

## Листинг 3 — Логика чек-ина участника по QR-коду (NestJS)

```typescript
// backend/src/modules/attendance/attendance.service.ts

async scanQr(rawToken: string, userId: string, callerRole = 'ORGANIZER') {
  const payload = AttendanceService.verifyToken(rawToken);
  if (!payload) throw new BadRequestException('Недействительный QR-код');

  const { rid, uid, eid, name, group, institute } = payload;

  // Проверяем право организатора на мероприятие
  const event = await this.prisma.event.findUnique({ where: { id: eid } });
  if (!event) throw new NotFoundException('Мероприятие не найдено');

  if (callerRole !== 'ADMIN') {
    const profile = await this.prisma.organizerProfile.findUnique({ where: { userId } });
    if (!profile || event.organizerId !== profile.id)
      throw new ForbiddenException('Вы не являетесь организатором этого мероприятия');
  }

  // Мероприятие ещё не началось
  if (new Date() < new Date(event.startAt)) {
    const startsIn = Math.ceil(
      (new Date(event.startAt).getTime() - Date.now()) / 60000
    );
    throw new BadRequestException(
      `Мероприятие ещё не началось. До начала: ${startsIn} мин.`
    );
  }

  const reg = await this.prisma.registration.findUnique({ where: { id: rid } });

  // Участник уже отмечен — возвращаем статус без ошибки
  if (reg?.status === RegistrationStatus.ATTENDED) {
    return { alreadyCheckedIn: true, checkedInAt: reg.checkedInAt,
             participant: { name, group, institute } };
  }

  const updated = await this.prisma.registration.update({
    where: { id: rid },
    data: { checkedInAt: new Date(), checkInSource: 'QR_SCAN',
            status: RegistrationStatus.ATTENDED },
  });

  return { alreadyCheckedIn: false, checkedInAt: updated.checkedInAt,
           participant: { name, group, institute } };
}
```

---

## Листинг 4 — QR-сканер через камеру браузера (React + jsQR)

```typescript
// frontend/src/pages/QrScannerPage/QrScannerPage.tsx

const tick = useCallback(() => {
  const video  = videoRef.current;
  const canvas = canvasRef.current;
  if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
    animRef.current = requestAnimationFrame(tick);
    return;
  }
  canvas.height = video.videoHeight;
  canvas.width  = video.videoWidth;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height,
    { inversionAttempts: 'dontInvert' });

  if (code?.data) processToken(code.data); // отправить токен на сервер
  animRef.current = requestAnimationFrame(tick);
}, [processToken]);

const startCamera = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }, // задняя камера телефона
  });
  videoRef.current!.srcObject = stream;
  videoRef.current!.play();
  animRef.current = requestAnimationFrame(tick);
};
```

---

## Листинг 5 — JWT-аутентификация: генерация пары токенов (NestJS)

```typescript
// backend/src/modules/auth/auth.service.ts

private async generateTokens(user: { id: string; login: string; role: string }) {
  const payload = { sub: user.id, login: user.login, role: user.role };

  const accessToken = this.jwtService.sign(payload, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const rawRefresh  = crypto.randomBytes(64).toString('hex');
  const tokenHash   = crypto.createHash('sha256').update(rawRefresh).digest('hex');
  const expiresAt   = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await this.prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return { accessToken, refreshToken: rawRefresh,
           user: { id: user.id, login: user.login, role: user.role } };
}
```

---

## Листинг 6 — Axios-интерсептор: автоматическое обновление access-токена (React)

```typescript
// frontend/src/shared/api/client.ts

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`,
            { refreshToken });
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(original); // повтор исходного запроса
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Листинг 7 — Планировщик: автоматическое завершение мероприятий (NestJS)

```typescript
// backend/src/modules/scheduler/scheduler.service.ts

@Cron(CronExpression.EVERY_MINUTE)
async updateEventStatuses() {
  const now = new Date();

  // Мероприятия с явным временем окончания
  const withEndAt = await this.prisma.event.updateMany({
    where: { status: EventStatus.PUBLISHED, endAt: { lt: now } },
    data:  { status: EventStatus.COMPLETED },
  });

  // Мероприятия без endAt — завершаем через 4 часа после startAt
  const withoutEndAt = await this.prisma.event.updateMany({
    where: {
      status: EventStatus.PUBLISHED,
      endAt:  null,
      startAt: { lt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
    },
    data: { status: EventStatus.COMPLETED },
  });

  const total = withEndAt.count + withoutEndAt.count;
  if (total > 0) this.logger.log(`Завершено мероприятий: ${total}`);
}
```

---

## Листинг 8 — Валидация пароля (frontend + backend)

```typescript
// frontend/src/shared/utils/passwordValidation.ts

export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(
    /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/,
    'Только латинские буквы, цифры и спецсимволы'
  )
  .regex(/[a-zA-Z]/, 'Должна быть хотя бы одна буква')
  .regex(/[0-9]/,    'Должна быть хотя бы одна цифра');
```

```typescript
// backend/src/modules/auth/dto/register.dto.ts

@IsString()
@MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
@Matches(/[a-zA-Z]/, { message: 'Пароль должен содержать хотя бы одну латинскую букву' })
@Matches(/[0-9]/,    { message: 'Пароль должен содержать хотя бы одну цифру' })
password: string;
```

---

## Листинг 9 — Экспорт участников в CSV с BOM (NestJS)

```typescript
// backend/src/modules/registration/registration.service.ts

async exportCsv(eventId: string, callerUserId: string, callerRole: string) {
  const registrations = await this.prisma.registration.findMany({
    where: { eventId },
    orderBy: { registeredAt: 'asc' },
    include: {
      user: {
        select: {
          email: true,
          studentProfile: { include: { institute: { select: { name: true } } } },
        },
      },
    },
  });

  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = ['№','ФИО','Группа','Курс','Институт',
                  'Email','Статус','Зарегистрирован','Чек-ин'];
  const rows = registrations.map((reg, idx) => {
    const sp = reg.user.studentProfile;
    return [
      idx + 1,
      esc(sp?.fullName ?? '—'),
      esc(sp?.group ?? '—'),
      sp?.yearOfStudy ?? '—',
      esc(sp?.institute?.name ?? '—'),
      esc(reg.user.email),
      esc(reg.status),
      esc(reg.registeredAt.toLocaleString('ru-RU')),
      esc(reg.checkedInAt?.toLocaleString('ru-RU') ?? '—'),
    ].join(';');
  });

  return [header.map(esc).join(';'), ...rows].join('\r\n');
}
```

---

## Листинг 10 — Хук useDownloadCsv: скачивание файла с авторизацией (React)

```typescript
// frontend/src/shared/hooks/useDownloadCsv.ts

export function useDownloadCsv() {
  const { accessToken } = useAuthStore();

  return async (url: string, filename: string) => {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Ошибка загрузки файла');

    const blob = await res.blob();
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };
}
```
