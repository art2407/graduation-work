# Frontend Architecture (Feature-Sliced Design)

frontend/
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── app/                    # App-level settings
│   │   ├── providers/          # Global providers (QueryClient, Router, Theme)
│   │   ├── styles/             # Global styles
│   │   └── types/              # Global TypeScript types
│   │
│   ├── pages/                  # Page components (routes)
│   │   ├── home/               # Главная / Афиша
│   │   ├── auth/               # Авторизация / Регистрация
│   │   ├── profile/            # Личный кабинет
│   │   ├── event/              # Страница мероприятия
│   │   ├── admin/              # Админ-панель
│   │   └── not-found/          # 404
│   │
│   ├── widgets/                # Composite blocks
│   │   ├── header/             # Шапка с навигацией
│   │   ├── footer/             # Подвал
│   │   ├── event-list/         # Список мероприятий с фильтрами
│   │   ├── event-card/         # Карточка мероприятия
│   │   ├── auth-form/          # Формы входа/регистрации
│   │   ├── profile-summary/    # Сводка профиля
│   │   └── qr-scanner/         # QR сканер для чек-ина
│   │
│   ├── features/               # User interactions
│   │   ├── auth-by-login/      # Авторизация по логину/паролю
│   │   ├── register-user/      # Регистрация пользователя
│   │   ├── rsvp-to-event/      # Запись на мероприятие
│   │   ├── cancel-rsvp/        # Отмена записи
│   │   ├── check-in-by-qr/     # Чек-ин по QR
│   │   ├── upload-certificate/ # Загрузка сертификата (организатор)
│   │   ├── moderate-event/     # Модерация мероприятия (админ)
│   │   └── filter-events/      # Фильтрация мероприятий
│   │
│   ├── entities/               # Business entities
│   │   ├── user/               # Пользователь (types, api, model)
│   │   ├── event/              # Мероприятие
│   │   ├── organizer/          # Организатор
│   │   ├── certificate/        # Сертификат
│   │   └── institute/          # Институт (справочник)
│   │
│   └── shared/                 # Reusable code
│       ├── api/                # API client (axios instance)
│       ├── config/             # Config files
│       ├── lib/                # Utility functions
│       ├── ui/                 # UI Kit (buttons, inputs, modals)
│       ├── hooks/              # Shared hooks
│       └── constants/          # Shared constants
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json

## State Management

- **TanStack Query**: Server state (API caching, background updates)
- **Zustand**: Client state (UI state, filters, offline queue)
- **IndexedDB**: Offline storage for PWA

## Key Features

1. **PWA Support**: Service Worker, Manifest, Offline mode
2. **Lazy Loading**: Code splitting by routes
3. **Yandex Maps**: Lazy loaded only on event pages
4. **Responsive**: Mobile-first, breakpoints 320/768/1024/1440px
5. **Theme**: Light/Dark mode with system preference
