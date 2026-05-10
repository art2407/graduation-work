import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { EventNote } from '@mui/icons-material';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Box
      display="flex" flexDirection="column" alignItems="center"
      justifyContent="center" minHeight="60vh" textAlign="center" gap={2}
    >
      <EventNote sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h2" fontWeight={700} color="text.disabled">404</Typography>
      <Typography variant="h5" color="text.secondary">Страница не найдена</Typography>
      <Typography variant="body2" color="text.disabled">
        Запрошенная страница не существует или была удалена
      </Typography>
      <Button variant="contained" onClick={() => navigate('/events')} sx={{ mt: 1 }}>
        На главную
      </Button>
    </Box>
  );
}
