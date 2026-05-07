import { Box, Typography, Alert } from '@mui/material';
import { QrCode } from '@mui/icons-material';

// Страница-заглушка — функциональность перенесена:
// • Студент: QR-код в Профиль → История мероприятий
// • Организатор: сканер на странице /scan
export default function QrPage() {
  return (
    <Box maxWidth={500} mx="auto" textAlign="center" pt={4}>
      <QrCode sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} mb={2}>
        QR-чек-ин
      </Typography>
      <Alert severity="info" sx={{ textAlign: 'left' }}>
        <strong>Студенту:</strong> откройте раздел <em>Профиль → История мероприятий</em> и нажмите
        иконку QR рядом с нужным мероприятием.<br /><br />
        <strong>Организатору:</strong> воспользуйтесь пунктом меню <em>Сканер QR</em> или перейдите на
        страницу мероприятия и нажмите кнопку «Сканировать QR участников».
      </Alert>
    </Box>
  );
}
