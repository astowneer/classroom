import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Play, Download, Send, RefreshCw } from 'lucide-react';

const statusLabel = s => ({
  pending: 'Очікує', text_extracted: 'Текст витягнуто', checked: 'Перевірено',
  failed: 'Помилка', resubmit_review: 'На розгляді', resubmit_accepted: 'Прийнято',
  resubmit_rejected: 'Відхилено',
}[s] || s);

const statusVariant = s => ({
  checked: 'success', failed: 'destructive', resubmit_review: 'warning',
  resubmit_accepted: 'success', resubmit_rejected: 'destructive',
}[s] || 'secondary');

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notifyId, setNotifyId] = useState(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [aRes, rRes] = await Promise.all([
      api.get(`/assignments/${assignmentId}`),
      api.get(`/reports/assignment/${assignmentId}`),
    ]);
    setAssignment(aRes.data);
    setResults(rRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [assignmentId]);

  const sync = async () => {
    setSyncing(true);
    await api.post(`/submissions/sync/${assignmentId}`);
    await load();
    setSyncing(false);
  };

  const runCheck = async () => {
    setChecking(true);
    await api.post(`/submissions/check/${assignmentId}`);
    await load();
    setChecking(false);
  };

  const notify = async (id) => {
    if (!message.trim()) return;
    await api.post(`/submissions/${id}/notify`, { message });
    setNotifyId(null);
    setMessage('');
    await load();
  };

  const review = async (id, decision) => {
    await api.post(`/submissions/${id}/review`, { decision });
    await load();
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex-1">{assignment?.title}</h1>
      </div>
      <div className="flex gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />Синхронізувати роботи
        </Button>
        <Button size="sm" onClick={runCheck} disabled={checking}>
          <Play className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />Запустити перевірку
        </Button>
      </div>

      {results.length === 0 ? (
        <p className="text-muted-foreground">Робіт не знайдено.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Студент', 'Статус', 'Запозичення', 'Структура', 'Здано', 'Дії'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.submissionId} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.student?.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.student?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {r.plagiarismScore != null ? (
                      <span className={parseFloat(r.plagiarismScore) > 30 ? 'text-destructive font-medium' : 'text-green-700'}>
                        {r.plagiarismScore}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.structurePassed == null ? '—' : r.structurePassed
                      ? <Badge variant="success">✓</Badge>
                      : <Badge variant="destructive">✗</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('uk-UA') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="outline"
                        onClick={() => navigate(`/teacher/reports/${r.submissionId}`)}>
                        Звіт
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => window.open(`http://localhost:3000/api/reports/${r.submissionId}/download`)}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => setNotifyId(notifyId === r.submissionId ? null : r.submissionId)}>
                        <Send className="h-3 w-3" />
                      </Button>
                      {r.status === 'resubmit_review' && (
                        <>
                          <Button size="sm" variant="default" onClick={() => review(r.submissionId, 'accept')}>✓</Button>
                          <Button size="sm" variant="destructive" onClick={() => review(r.submissionId, 'reject')}>✗</Button>
                        </>
                      )}
                    </div>
                    {notifyId === r.submissionId && (
                      <div className="mt-2 flex gap-2">
                        <input className="border rounded px-2 py-1 text-xs flex-1"
                          placeholder="Повідомлення..." value={message}
                          onChange={e => setMessage(e.target.value)} />
                        <Button size="sm" onClick={() => notify(r.submissionId)}>Надіслати</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
