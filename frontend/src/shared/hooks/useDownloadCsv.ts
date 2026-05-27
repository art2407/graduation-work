import { useAuthStore } from '../store/auth.store';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export function useDownloadCsv() {
  const { accessToken } = useAuthStore();

  return async (url: string, filename: string) => {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error('Ошибка загрузки файла');

    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };
}
