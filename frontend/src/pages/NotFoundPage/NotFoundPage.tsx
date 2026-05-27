import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { EventNote, ArrowForward } from '@mui/icons-material';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="70vh"
      textAlign="center"
      gap={2}
    >
      {/* Иконка */}
      <Box sx={{
        width: 88, height: 88, borderRadius: '24px', mb: 1,
        background: 'linear-gradient(135deg, #E9E7F9 0%, #C7D2FE 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <EventNote sx={{ fontSize: 44, color: '#4F46E5' }} />
      </Box>

      {/* 404 */}
      <Typography
        variant="h1"
        fontWeight={800}
        color="text.primary"
        sx={{ fontSize: '5rem', lineHeight: 1, letterSpacing: '-2px' }}
      >
        404
      </Typography>

      <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.3px' }}>
        Страница не найдена
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={320}>
        Запрошенная страница не существует или была удалена. Вернитесь на главную.
      </Typography>

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForward />}
        onClick={() => navigate('/events')}
        sx={{ mt: 1, px: 3, borderRadius: '12px' }}
      >
        На главную
      </Button>
    </Box>
  );
}
