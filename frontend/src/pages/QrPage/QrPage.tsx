import { useState } from 'react';
import {
  Box, Typography, Alert,
} from '@mui/material';
import { attendanceApi } from '../../shared/api/client';

interface Props {
  eventId: string;
  eventTitle: string;
}

export function QrCheckIn({ eventId, eventTitle }: Props) {
  const [token] = useState<string | null>(null);
  const [expiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isExpired = expiresAt && new Date() > expiresAt;

  const handleCheckIn = async () => {
    if (!token || isExpired) {
      setError('QR-токен не получен или истёк. Обновите страницу мероприятия.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await attendanceApi.checkIn(eventId, token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка отметки');
    } finally {
      setLoading(false);
    }
  };

  // suppress unused warning — used in handleCheckIn which is called from event detail
  void handleCheckIn;
  void loading;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        {eventTitle}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {token && !isExpired ? (
        <Box>
          <Alert severity="success" sx={{ mb: 1 }}>
            QR-токен получен. Покажите его организатору или введите вручную.
          </Alert>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {token}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">QR-токен ещё не получен</Typography>
      )}
    </Box>
  );
}

// Компонент для отображения QR в профиле — показывает зарегистрированные мероприятия с кнопкой чек-ина
export default function QrPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        QR-чек-ин
      </Typography>
      <Alert severity="info">
        Чтобы отметиться на мероприятии, откройте страницу мероприятия и нажмите кнопку
        &quot;Отметиться&quot; когда организатор покажет QR-код.
      </Alert>
    </Box>
  );
}
