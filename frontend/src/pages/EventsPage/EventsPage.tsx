import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDebounce } from '../../shared/hooks/useDebounce';
import {
  Grid, Typography, Box, TextField, Skeleton, Alert, Button,
  InputAdornment, Pagination, LinearProgress, Select, MenuItem,
  FormControl, InputLabel,
} from '@mui/material';
import { Search, Add, EventBusy } from '@mui/icons-material';
import { eventsApi, referencesApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';
import EventCard from '../../components/EventCard/EventCard';

// Типы событий с иконками
const TYPE_CHIPS = [
  { value: '',          label: 'Все' },
  { value: 'academic',  label: 'Академическое' },
  { value: 'hackathon', label: 'Хакатон' },
  { value: 'career',    label: 'Карьерное' },
  { value: 'cultural',  label: 'Культурное' },
  { value: 'sport',     label: 'Спортивное' },
  { value: 'social',    label: 'Социальное' },
  { value: 'volunteer', label: 'Волонтёрское' },
  { value: 'other',     label: 'Другое' },
];

// Скелетон-карточка
function CardSkeleton() {
  return (
    <Box sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E9E7F9' }}>
      <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 0 }} />
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={14} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="90%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="75%" height={20} sx={{ mb: 1.5 }} />
        <Skeleton variant="text" width="50%" height={14} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="65%" height={14} />
      </Box>
    </Box>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const search      = searchParams.get('search')      ?? '';
  const type        = searchParams.get('type')        ?? '';
  const instituteId = searchParams.get('instituteId') ?? '';
  const page        = Number(searchParams.get('page') ?? '1');

  const debouncedSearch = useDebounce(search, 400);

  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) { next.set(key, value); } else { next.delete(key); }
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  }

  const { data: institutesData } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
  });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['events', { search: debouncedSearch, type, instituteId, page }],
    queryFn: () =>
      eventsApi.getAll({
        search:      debouncedSearch || undefined,
        type:        type            || undefined,
        instituteId: instituteId     || undefined,
        page,
        limit: 12,
      }).then((r) => r.data),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  return (
    <Box>

      {/* ── Заголовок ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
            Мероприятия
          </Typography>
          {data?.pagination && !isLoading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Найдено: {data.pagination.total ?? data.data?.length ?? 0}
            </Typography>
          )}
        </Box>
        {user?.role === 'ORGANIZER' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/events/new')}
            size="large"
            sx={{ borderRadius: '12px' }}
          >
            Создать
          </Button>
        )}
      </Box>

      {/* ── Поиск ── */}
      <TextField
        placeholder="Поиск мероприятий..."
        value={search}
        onChange={(e) => updateParam('search', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          sx: { borderRadius: '14px', bgcolor: 'background.paper' },
        }}
      />

      {/* ── Чипы фильтрации по типу ── */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 1,
          mb: 1.5,
          // Скрываем полосу прокрутки визуально
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {TYPE_CHIPS.map((chip) => {
          const active = type === chip.value;
          return (
            <Box
              key={chip.value}
              onClick={() => updateParam('type', chip.value)}
              sx={{
                flexShrink: 0,
                px: 2, py: 0.75,
                borderRadius: '20px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all .15s ease',
                border: '1.5px solid',
                ...(active
                  ? {
                      bgcolor: 'primary.main',
                      borderColor: 'primary.main',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(79,70,229,.30)',
                    }
                  : {
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': { borderColor: 'primary.light', color: 'primary.main' },
                    }),
              }}
            >
              {chip.label}
            </Box>
          );
        })}
      </Box>

      {/* ── Фильтр по организации ── */}
      <FormControl fullWidth sx={{ mb: 1.5 }}>
        <InputLabel>Организация</InputLabel>
        <Select
          value={instituteId}
          label="Организация"
          onChange={(e) => updateParam('instituteId', e.target.value)}
          MenuProps={{
            PaperProps: {
              sx: {
                maxWidth: 'min(420px, calc(100vw - 32px))',
                '& .MuiMenuItem-root': { whiteSpace: 'normal', lineHeight: 1.4 },
              },
            },
          }}
        >
          <MenuItem value="">Все организации</MenuItem>
          {institutesData?.map((i: any) => (
            <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ── Индикатор подгрузки ── */}
      <Box sx={{ height: 3, mb: 2 }}>
        {isFetching && !isLoading && <LinearProgress />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Ошибка загрузки мероприятий
        </Alert>
      )}

      {/* ── Список ── */}
      {isLoading || !data?.data ? (
        <Grid container spacing={2.5}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <CardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : data.data.length === 0 ? (
        /* Пустое состояние */
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            py: 10, gap: 1.5,
          }}
        >
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px',
            bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EventBusy sx={{ fontSize: 36, color: 'primary.light' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Мероприятий не найдено
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={300}>
            Попробуйте изменить фильтры или поисковый запрос
          </Typography>
          {(search || type || instituteId) && (
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => setSearchParams({}, { replace: true })}
            >
              Сбросить фильтры
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5}>
            {data.data.map((event: any) => (
              <Grid item xs={12} sm={6} md={4} key={event.id}>
                <EventCard event={event} />
              </Grid>
            ))}
          </Grid>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={5}>
              <Pagination
                count={data.pagination.totalPages}
                page={page}
                onChange={(_, p) => updateParam('page', String(p))}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
