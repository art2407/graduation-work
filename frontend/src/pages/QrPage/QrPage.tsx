import { Box, Typography } from '@mui/material';
import { QrCode2, School, CameraAlt } from '@mui/icons-material';

// Страница-заглушка — функциональность перенесена:
// • Студент: QR-код в Профиль → История мероприятий
// • Организатор: сканер на странице /scan
export default function QrPage() {
  return (
    <Box maxWidth={480} mx="auto" textAlign="center" pt={4}>

      {/* Иконка */}
      <Box sx={{
        width: 80, height: 80, borderRadius: '22px', mx: 'auto', mb: 3,
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <QrCode2 sx={{ fontSize: 40, color: 'white' }} />
      </Box>

      <Typography variant="h5" fontWeight={800} color="text.primary" mb={0.75}
        sx={{ letterSpacing: '-0.3px' }}>
        QR-чек-ин
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Отмечайте посещаемость быстро и удобно
      </Typography>

      {/* Карточки инструкций */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, textAlign: 'left' }}>
        <Box sx={{
          display: 'flex', gap: 2, alignItems: 'flex-start',
          p: 2.5, borderRadius: '14px',
          bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px', bgcolor: '#C7D2FE', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <School sx={{ color: '#4338CA', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={0.25}>
              Студентам
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Откройте раздел <strong>Профиль → История мероприятий</strong> и нажмите
              иконку QR рядом с нужным мероприятием.
            </Typography>
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', gap: 2, alignItems: 'flex-start',
          p: 2.5, borderRadius: '14px',
          bgcolor: '#FFF7ED', border: '1px solid #FDE68A',
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px', bgcolor: '#FDE68A', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CameraAlt sx={{ color: '#92400E', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={0.25}>
              Организаторам
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Воспользуйтесь пунктом меню <strong>Сканер QR</strong> или перейдите на страницу
              мероприятия и нажмите кнопку «Сканировать QR участников».
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
