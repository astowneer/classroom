import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Spinner, Badge } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Upload, Play } from 'lucide-react';
import Chat from '../../components/Chat';

export default function StudentSubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [report, setReport] = useState(null);
  const [resub, setResub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const sRes = await api.get('/submissions');
    const sub = sRes.data.find(s => s.id === parseInt(id));
    setSubmission(sub);
    if (sub) {
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
    const r = await api.post(`/submissions/${id}/resubmit`, form);
    setResub(r.data);
    setUploading(false);
  };

  const selfCheck = async () => {
    setChecking(true);
    try {
      const r = await api.post(`/submissions/${id}/self-check`);
      setResub(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Помилка перевірки');
    }
    setChecking(false);
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;
  if (!submission) return <p className="text-muted-foreground">Роботу не знайдено.</p>;

  const hasPendingResub = resub?.status === 'pending';
  const hasCheckedResub = resub?.status === 'checked';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/student/submissions')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{submission.assignment?.title || `Робота #${id}`}</h1>
          <p className="text-xs text-muted-foreground">{submission.assignment?.course?.name}</p>
        </div>
      </div>

      {/* Official report from teacher */}
      {report && (
        <div className="mb-6 border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Результати перевірки викладачем</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Запозичення: </span>
              <span className={parseFloat(report.plagiarismScore * 100) > 30 ? 'text-destructive font-medium' : 'text-green-700 font-medium'}>
                {report.plagiarismScore != null ? `${(report.plagiarismScore * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Структура: </span>
              <Badge variant={report.structurePassed ? 'success' : 'destructive'} className="text-xs">
                {report.structurePassed ? 'Пройдено' : 'Не пройдено'}
              </Badge>
            </div>
            {report.grade && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Оцінка: </span>
                <span className="font-medium">{report.grade.total} / {report.grade.maxTotal}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Self-check section */}
      <div className="border rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3">Самоперевірка</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Завантажте свою роботу щоб перевірити відсоток запозичення. Результат видно тільки вам і не впливає на оцінку викладача.
        </p>
        <div className="flex gap-2 mb-3">
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={upload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />{uploading ? 'Завантаження...' : 'Завантажити PDF'}
          </Button>
          {hasPendingResub && (
            <Button size="sm" onClick={selfCheck} disabled={checking}>
              <Play className="h-4 w-4 mr-2" />{checking ? 'Перевірка...' : 'Перевірити'}
            </Button>
          )}
        </div>

        {hasCheckedResub && resub.reportDetails && (
          <div className="bg-muted/30 rounded p-3 text-sm flex flex-col gap-1">
            <p><span className="text-muted-foreground">Запозичення: </span>
              <span className={resub.plagiarismScore > 0.3 ? 'text-destructive font-medium' : 'text-green-700 font-medium'}>
                {(resub.plagiarismScore * 100).toFixed(1)}%
              </span>
            </p>
            <p><span className="text-muted-foreground">Структура: </span>
              {resub.reportDetails.structureResult?.passed ? '✓ Пройдено' : '✗ Не пройдено'}
            </p>
            {resub.reportDetails.structureResult?.missing?.length > 0 && (
              <p className="text-xs text-destructive">Відсутні: {resub.reportDetails.structureResult.missing.join(', ')}</p>
            )}
          </div>
        )}
      </div>

      <Chat submissionId={parseInt(id)} />
    </div>
  );
}
