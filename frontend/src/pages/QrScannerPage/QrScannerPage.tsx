import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Box, Typography, Button, Stack, CircularProgress,
} from '@mui/material';
import {
  CheckCircle, Error as ErrorIcon, CameraAlt, Stop,
} from '@mui/icons-material';
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
    if (code?.data) processToken(code.data);
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
    <Box maxWidth={580} mx="auto">

      {/* ── Шапка ── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.3px' }}>
          Сканер QR-кодов
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.25}>
          Направьте камеру на QR-код участника для отметки посещения
        </Typography>
      </Box>

      {/* ── Камера ── */}
      <Box sx={{
        bgcolor: 'background.paper', borderRadius: '20px',
        border: '1px solid', borderColor: 'divider',
        overflow: 'hidden', mb: 2,
      }}>
        {/* Видео-область */}
        <Box sx={{
          position: 'relative', bgcolor: '#0F0F1A',
          aspectRatio: '4/3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <video
            ref={videoRef}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: scanning ? 'block' : 'none',
            }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Пустое состояние */}
          {!scanning && (
            <Box textAlign="center" sx={{ color: 'rgba(255,255,255,.5)' }}>
              <CameraAlt sx={{ fontSize: 56, mb: 1 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Камера не активна
              </Typography>
            </Box>
          )}

          {/* Прицел */}
          {scanning && (
            <Box sx={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200, height: 200,
              pointerEvents: 'none',
            }}>
              {/* Угловые маркеры */}
              {[
                { top: 0, left: 0, borderTop: '3px solid', borderLeft: '3px solid', borderRadius: '4px 0 0 0' },
                { top: 0, right: 0, borderTop: '3px solid', borderRight: '3px solid', borderRadius: '0 4px 0 0' },
                { bottom: 0, left: 0, borderBottom: '3px solid', borderLeft: '3px solid', borderRadius: '0 0 0 4px' },
                { bottom: 0, right: 0, borderBottom: '3px solid', borderRight: '3px solid', borderRadius: '0 0 4px 0' },
              ].map((style, i) => (
                <Box key={i} sx={{
                  position: 'absolute', width: 24, height: 24,
                  borderColor: loading ? '#F97316' : '#4F46E5',
                  ...style,
                  transition: 'border-color .3s',
                }} />
              ))}
            </Box>
          )}

          {/* Загрузка */}
          {loading && (
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,.55)',
            }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          )}
        </Box>

        {/* Кнопка управления */}
        <Box sx={{ p: 2 }}>
          {!scanning ? (
            <Button
              variant="contained"
              fullWidth
              startIcon={<CameraAlt />}
              onClick={startCamera}
              size="large"
              sx={{ borderRadius: '12px', py: 1.5 }}
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
              size="large"
              sx={{ borderRadius: '12px', py: 1.5 }}
            >
              Остановить
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Ошибка камеры ── */}
      {cameraError && (
        <Box sx={{
          display: 'flex', gap: 1.5, alignItems: 'flex-start',
          p: 2, mb: 2, borderRadius: '12px',
          bgcolor: '#FEF2F2', border: '1px solid #FECACA',
        }}>
          <ErrorIcon sx={{ color: '#991B1B', mt: 0.1, flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: '#991B1B' }}>{cameraError}</Typography>
        </Box>
      )}

      {/* ── Результат сканирования ── */}
      {result && (
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: '16px',
          border: '2px solid',
          borderColor: result.ok
            ? (result.alreadyCheckedIn ? '#FDE68A' : '#6EE7B7')
            : '#FECACA',
          p: 2.5,
        }}>
          {result.ok ? (
            result.alreadyCheckedIn ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%', bgcolor: '#FEF3C7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ErrorIcon sx={{ color: '#D97706', fontSize: 20 }} />
                  </Box>
                  <Typography fontWeight={700} color="#D97706">Уже отмечен</Typography>
                </Box>
                <ParticipantInfo participant={result.participant!} />
                {result.checkedInAt && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Отмечен: {new Date(result.checkedInAt).toLocaleString('ru-RU')}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%', bgcolor: '#D1FAE5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle sx={{ color: '#065F46', fontSize: 20 }} />
                  </Box>
                  <Typography fontWeight={700} color="#065F46">Успешно отмечен</Typography>
                </Box>
                <ParticipantInfo participant={result.participant!} />
              </Box>
            )
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%', bgcolor: '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ErrorIcon sx={{ color: '#991B1B', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography fontWeight={700} color="#991B1B">Ошибка</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.25}>
                  {result.error}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function ParticipantInfo({ participant }: {
  participant: { name: string; group: string; institute: string };
}) {
  return (
    <Box>
      <Typography fontWeight={700} color="text.primary">{participant.name || '—'}</Typography>
      <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
        {participant.group && (
          <Box sx={{
            px: 1.5, py: 0.3, borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
            bgcolor: '#EEF2FF', color: '#4338CA',
          }}>
            {participant.group}
          </Box>
        )}
        {participant.institute && (
          <Box sx={{
            px: 1.5, py: 0.3, borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
            bgcolor: '#F3F4F6', color: '#374151',
          }}>
            {participant.institute}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
