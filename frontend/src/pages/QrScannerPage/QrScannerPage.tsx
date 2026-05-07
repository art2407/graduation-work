import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Box, Typography, Paper, Alert, Button, Stack, Chip,
  CircularProgress, Divider,
} from '@mui/material';
import { CheckCircle, Error, CameraAlt, Stop } from '@mui/icons-material';
import { attendanceApi } from '../../shared/api/client';

type ScanResult = {
  ok: boolean;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string | null;
  participant?: { name: string; group: string; institute: string };
  error?: string;
};

export default function QrScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const processToken = useCallback(async (token: string) => {
    if (token === lastTokenRef.current || cooldownRef.current) return;
    lastTokenRef.current = token;
    cooldownRef.current = true;
    setLoading(true);
    setResult(null);

    try {
      const { data } = await attendanceApi.scanQr(token);
      setResult({
        ok: true,
        alreadyCheckedIn: data.alreadyCheckedIn,
        checkedInAt: data.checkedInAt,
        participant: data.participant,
      });
    } catch (err: any) {
      setResult({
        ok: false,
        error: err.response?.data?.message ?? 'Ошибка сканирования',
      });
    } finally {
      setLoading(false);
      // Разрешаем следующее сканирование через 3 сек
      setTimeout(() => {
        cooldownRef.current = false;
        lastTokenRef.current = null;
      }, 3000);
    }
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code?.data) {
      processToken(code.data);
    }
    animRef.current = requestAnimationFrame(tick);
  }, [processToken]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      animRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError('Нет доступа к камере. Разрешите использование камеры в настройках браузера.');
    }
  }, [tick]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <Box maxWidth={600} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={1}>
        Сканер QR-кодов
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Направьте камеру на QR-код участника для отметки посещения
      </Typography>

      <Paper elevation={2} sx={{ overflow: 'hidden', mb: 2 }}>
        {/* Область камеры */}
        <Box
          sx={{
            position: 'relative',
            bgcolor: 'black',
            aspectRatio: '4/3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: scanning ? 'block' : 'none',
            }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!scanning && (
            <Box textAlign="center" color="white">
              <CameraAlt sx={{ fontSize: 64, opacity: 0.5, mb: 1 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Камера не активна
              </Typography>
            </Box>
          )}

          {/* Прицел */}
          {scanning && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200, height: 200,
                border: '3px solid',
                borderColor: loading ? 'warning.main' : 'primary.main',
                borderRadius: 2,
                pointerEvents: 'none',
                '&::before, &::after': {
                  content: '""',
                  position: 'absolute',
                  width: 24, height: 24,
                  borderColor: 'inherit',
                },
              }}
            />
          )}

          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'rgba(0,0,0,0.6)',
                borderRadius: 2,
                p: 2,
              }}
            >
              <CircularProgress size={36} sx={{ color: 'white' }} />
            </Box>
          )}
        </Box>

        {/* Кнопки управления */}
        <Box p={2}>
          <Stack direction="row" spacing={2}>
            {!scanning ? (
              <Button
                variant="contained"
                fullWidth
                startIcon={<CameraAlt />}
                onClick={startCamera}
              >
                Включить камеру
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<Stop />}
                onClick={stopCamera}
              >
                Остановить
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {cameraError && <Alert severity="error" sx={{ mb: 2 }}>{cameraError}</Alert>}

      {/* Результат сканирования */}
      {result && (
        <Paper elevation={2} sx={{ p: 2 }}>
          {result.ok ? (
            result.alreadyCheckedIn ? (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Error color="warning" />
                  <Typography fontWeight={600} color="warning.main">
                    Уже отмечен
                  </Typography>
                </Stack>
                <Divider />
                <ParticipantInfo participant={result.participant!} />
                <Typography variant="caption" color="text.secondary">
                  Отмечен: {result.checkedInAt
                    ? new Date(result.checkedInAt).toLocaleString('ru-RU')
                    : '—'}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircle color="success" />
                  <Typography fontWeight={600} color="success.main">
                    Успешно отмечен
                  </Typography>
                </Stack>
                <Divider />
                <ParticipantInfo participant={result.participant!} />
              </Stack>
            )
          ) : (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Error color="error" sx={{ mt: 0.3 }} />
              <Typography color="error">{result.error}</Typography>
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}

function ParticipantInfo({ participant }: {
  participant: { name: string; group: string; institute: string };
}) {
  return (
    <Stack spacing={0.5}>
      <Typography fontWeight={600}>{participant.name || '—'}</Typography>
      <Stack direction="row" spacing={1}>
        {participant.group && (
          <Chip label={participant.group} size="small" variant="outlined" />
        )}
        {participant.institute && (
          <Chip label={participant.institute} size="small" variant="outlined" />
        )}
      </Stack>
    </Stack>
  );
}
