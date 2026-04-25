import api from '../lib/api';

export function useDownloadPdf() {
  return async (submissionId) => {
    const response = await api.get(`/reports/${submissionId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${submissionId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
