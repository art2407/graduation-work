import {
  Card, CardContent, CardMedia, CardActionArea, Chip, Typography, Box, Stack,
} from '@mui/material';
import { CalendarToday, LocationOn, People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Event } from '../../shared/types';

const EVENT_TYPE_LABELS: Record<string, string> = {
  academic: 'Академическое',
  career: 'Карьерное',
  cultural: 'Культурное',
  sport: 'Спортивное',
  social: 'Социальное',
  volunteer: 'Волонтёрское',
  hackathon: 'Хакатон',
  other: 'Другое',
};

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  PUBLISHED: 'success',
  COMPLETED: 'default',
  CANCELLED: 'error',
  MODERATION: 'warning',
};

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const navigate = useNavigate();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => navigate(`/events/${event.id}`)} sx={{ flexGrow: 1 }}>
        {event.imageUrl && (
          <CardMedia
            component="img"
            height="160"
            image={event.imageUrl}
            alt={event.title}
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent>
          <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" gap={0.5}>
            <Chip
              label={EVENT_TYPE_LABELS[event.type] ?? event.type}
              size="small"
              color="primary"
              variant="outlined"
            />
            {event.status !== 'PUBLISHED' && (
              <Chip
                label={event.status}
                size="small"
                color={STATUS_COLORS[event.status] ?? 'default'}
              />
            )}
            {event.institute && (
              <Chip label={event.institute.name} size="small" variant="outlined" />
            )}
          </Stack>

          <Typography variant="h6" fontWeight={600} gutterBottom sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {event.title}
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={1} sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {event.organizer.organizationName}
          </Typography>

          <Stack spacing={0.5}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <CalendarToday fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {format(new Date(event.startAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {event.address}
              </Typography>
            </Box>
            {event.capacity && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <People fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {event.registeredCount} / {event.capacity} мест
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
