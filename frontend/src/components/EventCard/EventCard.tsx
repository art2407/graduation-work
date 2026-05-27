import { Box, Typography, LinearProgress } from '@mui/material';
import { CalendarToday, LocationOn, People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Event } from '../../shared/types';

// ── Цвета градиентов обложек по типу события ───────────────
const COVER_GRADIENT: Record<string, string> = {
  academic:  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  hackathon: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  career:    'linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)',
  cultural:  'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
  sport:     'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
  social:    'linear-gradient(135deg, #F97316 0%, #EC4899 100%)',
  volunteer: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  other:     'linear-gradient(135deg, #6B7280 0%, #374151 100%)',
};

// ── Цвета чипа категории по типу ────────────────────────────
const CHIP_STYLE: Record<string, { bg: string; color: string }> = {
  academic:  { bg: '#EEF2FF', color: '#4338CA' },
  hackathon: { bg: '#EEF2FF', color: '#4338CA' },
  career:    { bg: '#E0F2FE', color: '#0369A1' },
  cultural:  { bg: '#FDF4FF', color: '#9333EA' },
  sport:     { bg: '#DCFCE7', color: '#166534' },
  social:    { bg: '#FFF7ED', color: '#C2410C' },
  volunteer: { bg: '#D1FAE5', color: '#065F46' },
  other:     { bg: '#F3F4F6', color: '#374151' },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  academic:  'Академическое',
  career:    'Карьерное',
  cultural:  'Культурное',
  sport:     'Спортивное',
  social:    'Социальное',
  volunteer: 'Волонтёрское',
  hackathon: 'Хакатон',
  other:     'Другое',
};

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const navigate = useNavigate();

  const now = new Date();
  const isCompleted  = event.status === 'COMPLETED';
  const isCancelled  = event.status === 'CANCELLED';
  const isPast       = new Date(event.startAt) < now;
  const isRegClosed  = isCompleted || isPast ||
    (!!event.registrationDeadline && new Date(event.registrationDeadline) < now);

  const gradient = COVER_GRADIENT[event.type] ?? COVER_GRADIENT.other;
  const chipStyle = CHIP_STYLE[event.type]  ?? CHIP_STYLE.other;
  const typeLabel = EVENT_TYPE_LABELS[event.type] ?? event.type;

  const capacityFull = event.capacity
    ? event.registeredCount >= event.capacity
    : false;
  const capacityPct = event.capacity
    ? Math.min((event.registeredCount / event.capacity) * 100, 100)
    : 0;
  const fewLeft = event.capacity
    ? event.capacity - event.registeredCount <= 5 && !capacityFull
    : false;

  // статусный бейдж поверх обложки (только для не-PUBLISHED)
  const statusBadge =
    isCancelled  ? { label: 'Отменено',         bg: '#FEE2E2', color: '#991B1B' } :
    isCompleted  ? { label: 'Завершено',         bg: '#F3F4F6', color: '#374151' } :
    isRegClosed  ? { label: 'Регистрация закрыта', bg: '#FEF3C7', color: '#92400E' } :
    null;

  return (
    <Box
      onClick={() => navigate(`/events/${event.id}`)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        border: '1px solid #E9E7F9',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(30,27,75,.07)',
        transition: 'box-shadow .2s ease, transform .2s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(30,27,75,.13)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* ── Обложка ── */}
      <Box
        sx={{
          position: 'relative',
          height: 140,
          flexShrink: 0,
          background: event.imageUrl ? undefined : gradient,
          backgroundImage: event.imageUrl ? `url(${event.imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Затемнение снизу для градиентных обложек */}
        {!event.imageUrl && (
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.25) 100%)',
          }} />
        )}

        {/* Чип типа события */}
        <Box sx={{
          position: 'absolute', top: 10, left: 10,
          bgcolor: chipStyle.bg,
          color: chipStyle.color,
          fontSize: '0.7rem',
          fontWeight: 700,
          px: 1.25, py: 0.5,
          borderRadius: '8px',
          backdropFilter: 'blur(4px)',
          lineHeight: 1.4,
        }}>
          {typeLabel}
        </Box>

        {/* Статусный бейдж */}
        {statusBadge && (
          <Box sx={{
            position: 'absolute', top: 10, right: 10,
            bgcolor: statusBadge.bg,
            color: statusBadge.color,
            fontSize: '0.7rem',
            fontWeight: 700,
            px: 1.25, py: 0.5,
            borderRadius: '8px',
            lineHeight: 1.4,
          }}>
            {statusBadge.label}
          </Box>
        )}

        {/* Бейдж «Мест нет» / «Мало мест» */}
        {!statusBadge && capacityFull && (
          <Box sx={{
            position: 'absolute', top: 10, right: 10,
            bgcolor: '#FEE2E2', color: '#991B1B',
            fontSize: '0.7rem', fontWeight: 700,
            px: 1.25, py: 0.5, borderRadius: '8px', lineHeight: 1.4,
          }}>
            Мест нет
          </Box>
        )}
        {!statusBadge && fewLeft && (
          <Box sx={{
            position: 'absolute', top: 10, right: 10,
            bgcolor: '#FEF3C7', color: '#92400E',
            fontSize: '0.7rem', fontWeight: 700,
            px: 1.25, py: 0.5, borderRadius: '8px', lineHeight: 1.4,
          }}>
            Мало мест
          </Box>
        )}
      </Box>

      {/* ── Тело карточки ── */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

        {/* Название */}
        <Typography
          variant="subtitle1"
          sx={{
            mb: 0.75,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            color: 'text.primary',
          }}
        >
          {event.title}
        </Typography>

        {/* Организация */}
        {event.organizer?.organizationName && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.78rem',
            }}
          >
            🏛 {event.organizer.organizationName}
          </Typography>
        )}

        {/* Мета-информация */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarToday sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              {format(new Date(event.startAt), 'd MMM yyyy, HH:mm', { locale: ru })}
            </Typography>
          </Box>
          {event.address && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocationOn sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {event.address}{event.room ? `, ауд. ${event.room}` : ''}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Вместимость */}
        {event.capacity != null && (
          <Box sx={{ mt: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {event.registeredCount} / {event.capacity}
                </Typography>
              </Box>
              {capacityFull ? (
                <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 700, fontSize: '0.7rem' }}>
                  Заполнено
                </Typography>
              ) : fewLeft ? (
                <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.7rem' }}>
                  Осталось {event.capacity - event.registeredCount}
                </Typography>
              ) : null}
            </Box>
            <LinearProgress
              variant="determinate"
              value={capacityPct}
              sx={{
                height: 4,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: capacityFull ? '#EF4444' : fewLeft ? '#F59E0B' : '#4F46E5',
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
