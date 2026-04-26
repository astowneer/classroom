import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Upload, Play, Send } from 'lucide-react';
import ReportView from '../../components/ReportView';
import Chat from '../../components/Chat';

const statusLabel = s => ({
  pending: 'Очікує перевірки', text_extracted: 'Текст витягнуто', checked: 'Перевірено',
  failed: 'Помилка — перездайте', too_large: 'Файл занадто великий',
  resubmit_pending: 'Завантажено', resubmit_checked: 'Самоперевірка виконана',
  resubmit_review: 'На розгляді у викладача', resubmit_accepted: 'Прийнято', resubmit_rejected: 'Відхилено',
}[s] || s);

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

  const canResubmit = ['checked', 'failed', 'too_large', 'resubmit_rejected'].includes(submission.status);
  const canSelfCheck = submission.status === 'resubmit_pending';
  const canSubmitReview = submission.status === 'resubmit_checked';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/student/submissions')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{submission.assignment?.title || `Робота #${id}`}</h1>
          <p className="text-xs text-muted-foreground">{submission.assignment?.course?.name}</p>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">{statusLabel(submission.status)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
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
      </div>

      {/* Teacher comment */}
      {submission.teacherComment && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <span className="font-medium">Коментар викладача: </span>{submission.teacherComment}
        </div>
      )}

      {/* Report */}
      {report ? (
        <ReportView
          report={report}
          submission={report.submission || submission}
          student={report.submission?.student}
          assignment={report.submission?.assignment || submission.assignment}
        />
      ) : (
        <p className="text-muted-foreground text-sm">Звіт ще не сформовано.</p>
      )}

      <div className="mt-6">
        <Chat submissionId={parseInt(id)} />
      </div>
    </div>
  );
}
