import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Send } from 'lucide-react';
import ReportView from '../../components/ReportView';
import Chat from '../../components/Chat';

export default function ReportPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [showNotify, setShowNotify] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async () => {
    const r = await api.get(`/reports/${submissionId}`);
    setReport(r.data);
    setSubmission(r.data.submission);
    setLoading(false);
  };

  useEffect(() => { load(); }, [submissionId]);

  const review = async (decision) => {
    setActing(true);
    await api.post(`/submissions/${submissionId}/review`, { decision, comment: notifyMsg || undefined });
    await load();
    setActing(false);
    setShowNotify(false);
  };

  const notify = async () => {
    if (!notifyMsg.trim()) return;
    await api.post(`/submissions/${submissionId}/notify`, { message: notifyMsg });
    setNotifyMsg('');
    setShowNotify(false);
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;
  if (!report) return <p className="text-muted-foreground">Звіт не знайдено.</p>;

  const status = submission?.status;
  const isReview = status === 'resubmit_review';
  const resub = report.latestResubmission;

  // Build resubmission report view data if exists
  const resubReport = resub ? {
    plagiarismScore: resub.plagiarismScore,
    structurePassed: resub.structureResult?.passed,
    details: resub.reportDetails || {},
    grade: resub.grade,
    extractedFields: null,
  } : null;
  const resubSubmission = resub ? { ...submission, extractedText: resub.extractedText } : null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex-1">Звіт перевірки</h1>
        {status && (
          <span className="text-xs text-muted-foreground border rounded px-2 py-1">{status}</span>
        )}
      </div>

      {/* Review actions */}
      {isReview && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
          <p className="text-sm font-medium mb-3">Студент надіслав переробку на розгляд</p>
          <div className="flex flex-col gap-2">
            <textarea className="border rounded px-3 py-2 text-sm resize-none w-full" rows={2}
              placeholder="Коментар (необов'язково)..."
              value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review('accept')} disabled={acting}>
                ✓ Прийняти
              </Button>
              <Button size="sm" variant="destructive" onClick={() => review('reject')} disabled={acting}>
                ✗ Відхилити
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notify panel */}
      {!isReview && (
        <div className="mb-4 print:hidden">
          {showNotify ? (
            <div className="flex gap-2">
              <input className="border rounded px-3 py-1.5 text-sm flex-1"
                placeholder="Повідомлення студенту..."
                value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} />
              <Button size="sm" onClick={notify} disabled={!notifyMsg.trim()}>Надіслати</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNotify(false)}>✕</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowNotify(true)}>
              <Send className="h-4 w-4 mr-2" />Повідомити студента
            </Button>
          )}
        </div>
      )}

      <ReportView
        report={report}
        submission={submission}
        student={submission?.student}
        assignment={submission?.assignment}
      />

      <div className="mt-6 print:hidden">
        <Chat submissionId={parseInt(submissionId)} />
      </div>
    </div>
  );
}
