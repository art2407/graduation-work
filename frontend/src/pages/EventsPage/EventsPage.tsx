import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid, Typography, Box, TextField, Select, MenuItem, FormControl, InputLabel,
  Skeleton, Alert, Button, Stack, InputAdornment, Pagination,
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { eventsApi, referencesApi } from '../../shared/api/client';
import { useAuthStore } from '../../shared/store/auth.store';
import EventCard from '../../components/EventCard/EventCard';

export default function EventsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [page, setPage] = useState(1);

  const { data: typesData } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => referencesApi.getEventTypes().then((r) => r.data.types),
  });

  const { data: institutesData } = useQuery({
    queryKey: ['institutes'],
    queryFn: () => referencesApi.getInstitutes().then((r) => r.data.institutes),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', { search, type, instituteId, page }],
    queryFn: () =>
      eventsApi.getAll({ search: search || undefined, type: type || undefined,
        instituteId: instituteId || undefined, page, limit: 12 }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Мероприятия</Typography>
        {user?.role === 'ORGANIZER' && (
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/events/new')}>
            Создать
          </Button>
        )}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <TextField
          placeholder="Поиск..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          size="small"
          sx={{ flexGrow: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Тип</InputLabel>
          <Select value={type} label="Тип" onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <MenuItem value="">Все типы</MenuItem>
            {typesData?.map((t: any) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Институт</InputLabel>
          <Select
            value={instituteId}
            label="Институт"
            onChange={(e) => { setInstituteId(e.target.value); setPage(1); }}
          >
            <MenuItem value="">Все институты</MenuItem>
            {institutesData?.map((i: any) => (
              <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Ошибка загрузки мероприятий</Alert>}

      {isLoading ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : data?.data?.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">Мероприятий не найдено</Typography>
          <Typography variant="body2" color="text.secondary">Попробуйте изменить фильтры</Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {data?.data?.map((event: any) => (
              <Grid item xs={12} sm={6} md={4} key={event.id}>
                <EventCard event={event} />
              </Grid>
            ))}
          </Grid>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={data.pagination.totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
