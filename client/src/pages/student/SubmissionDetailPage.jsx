import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Upload, Play, Send, Download } from 'lucide-react';

export default function StudentSubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const sRes = await api.get('/submissions', { params: {} });
    const sub = sRes.data.find(s => s.id === parseInt(id));
    setSubmission(sub);
    if (sub?.status === 'checked' || sub?.status?.startsWith('resubmit')) {
      try { const rRes = await api.get(`/reports/${id}`); setReport(rRes.data); } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    await api.post(`/submissions/${id}/resubmit`, form);
    await load();
    setUploading(false);
  };

  const selfCheck = async () => {
    setChecking(true);
    await api.post(`/submissions/${id}/self-check`);
    await load();
    setChecking(false);
  };

  const submitReview = async () => {
    await api.post(`/submissions/${id}/submit-review`);
    await load();
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;
  if (!submission) return <p className="text-muted-foreground">Роботу не знайдено.</p>;

  const { structureResult, plagiarismMatches, completenessResult } = report?.details || {};
  const canResubmit = ['checked', 'failed', 'resubmit_rejected'].includes(submission.status);
  const canSelfCheck = submission.status === 'resubmit_pending';
  const canSubmitReview = submission.status === 'resubmit_checked';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/student/submissions')}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Робота #{id}</h1>
      </div>

      {/* Actions */}
      <Card className="mb-4">
        <CardContent className="pt-4 flex flex-wrap gap-2">
          {canResubmit && (
            <>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={upload} />
              <Button size="sm" onClick={() => fileRef.current.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />{uploading ? 'Завантаження...' : 'Завантажити переробку'}
              </Button>
            </>
          )}
          {canSelfCheck && (
            <Button size="sm" onClick={selfCheck} disabled={checking}>
              <Play className="h-4 w-4 mr-2" />{checking ? 'Перевірка...' : 'Самоперевірка'}
            </Button>
          )}
          {canSubmitReview && (
            <Button size="sm" onClick={submitReview}>
              <Send className="h-4 w-4 mr-2" />Надіслати викладачу
            </Button>
          )}
          {report && (
            <Button size="sm" variant="outline"
              onClick={() => window.open(`http://localhost:3000/api/reports/${id}/download`)}>
              <Download className="h-4 w-4 mr-2" />PDF звіт
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Teacher comment */}
      {submission.teacherComment && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-1">Коментар викладача:</p>
            <p className="text-sm">{submission.teacherComment}</p>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Запозичення</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{report.plagiarismScore != null ? `${(report.plagiarismScore * 100).toFixed(1)}%` : '—'}</p>
              {plagiarismMatches?.length === 0 && <p className="text-sm text-green-700 mt-1">Запозичень не виявлено</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Структура</CardTitle></CardHeader>
            <CardContent>
              <Badge variant={structureResult?.passed ? 'success' : 'destructive'}>
                {structureResult?.passed ? 'Пройдено' : 'Не пройдено'}
              </Badge>
              {structureResult?.missing?.length > 0 && (
                <p className="text-sm text-destructive mt-2">Відсутні розділи: {structureResult.missing.join(', ')}</p>
              )}
            </CardContent>
          </Card>
          {completenessResult && (
            <Card>
              <CardHeader><CardTitle>Повнота теми</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{completenessResult.score != null ? `${(completenessResult.score * 100).toFixed(1)}%` : '—'}</p>
                <p className="text-sm text-muted-foreground">{completenessResult.label}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
