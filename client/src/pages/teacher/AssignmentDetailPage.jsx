import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Play, Download, Send, RefreshCw } from 'lucide-react';
import StructureEditor from '../../components/StructureEditor';
import GradingEditor from '../../components/GradingEditor';
import { useDownloadPdf } from '../../hooks/useDownloadPdf';

const statusLabel = s => ({
  pending: 'Очікує', text_extracted: 'Текст витягнуто', checked: 'Перевірено',
  failed: 'Помилка', resubmit_review: 'На розгляді', resubmit_accepted: 'Прийнято',
  resubmit_rejected: 'Відхилено', resubmit_checked: 'Самоперевірка',
}[s] || s);

const statusVariant = s => ({
  checked: 'success', failed: 'destructive', resubmit_review: 'warning',
  resubmit_accepted: 'success', resubmit_rejected: 'destructive',
}[s] || 'secondary');

function ResultsTable({ results, navigate, downloadPdf, notifyId, setNotifyId, message, setMessage, notify, review }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {['Студент', 'Статус', 'Запозичення', 'Структура', 'Оцінка', 'Здано', 'Повід.', 'Дії'].map(h => (
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
                {r.plagiarismScore != null
                  ? <span className={parseFloat(r.plagiarismScore) > 30 ? 'text-destructive font-medium' : 'text-green-700'}>{r.plagiarismScore}</span>
                  : '—'}
              </td>
              <td className="px-4 py-3">
                {r.structurePassed == null ? '—' : r.structurePassed
                  ? <Badge variant="success">✓</Badge>
                  : <Badge variant="destructive">✗</Badge>}
              </td>
              <td className="px-4 py-3 font-medium">
                {r.grade ? `${r.grade.total}/${r.grade.maxTotal}` : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('uk-UA') : '—'}
              </td>
              <td className="px-4 py-3">
                {r.unreadMessages > 0
                  ? <span className="inline-flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5">{r.unreadMessages}</span>
                  : <span className="text-muted-foreground text-xs">—</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/reports/${r.submissionId}`)}>Звіт</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPdf(r.submissionId)}><Download className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setNotifyId(notifyId === r.submissionId ? null : r.submissionId)}>
                    <Send className="h-3 w-3" />
                  </Button>
                  {r.status === 'resubmit_review' && (
                    <>
                      <Button size="sm" onClick={() => review(r.submissionId, 'accept')}>✓</Button>
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
  );
}

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
  const [showStructure, setShowStructure] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [tab, setTab] = useState('results');
  const downloadPdf = useDownloadPdf();

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

  const sync = async () => { setSyncing(true); await api.post(`/submissions/sync/${assignmentId}`); await load(); setSyncing(false); };
  const runCheck = async () => { setChecking(true); await api.post(`/submissions/check/${assignmentId}`); await load(); setChecking(false); };
  const notify = async (id) => {
    if (!message.trim()) return;
    await api.post(`/submissions/${id}/notify`, { message });
    setNotifyId(null); setMessage(''); await load();
  };
  const review = async (id, decision) => { await api.post(`/submissions/${id}/review`, { decision }); await load(); };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  const failed = results.filter(r => r.status === 'failed' || r.status === 'too_large');
  const normal = results.filter(r => r.status !== 'failed' && r.status !== 'too_large');

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex-1">{assignment?.title}</h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button size="sm" variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />Синхронізувати
        </Button>
        <Button size="sm" onClick={runCheck} disabled={checking}>
          <Play className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />Запустити перевірку
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowStructure(s => !s)}>
          {showStructure ? 'Сховати структуру' : 'Налаштувати структуру'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowGrading(s => !s)}>
          {showGrading ? 'Сховати оцінювання' : 'Налаштувати оцінювання'}
        </Button>
      </div>

      {showStructure && (
        <div className="mb-4">
          <StructureEditor assignmentId={assignmentId} initial={assignment?.structureRequirements || []}
            initialMinLength={assignment?.minTextLength ?? 100}
            initialDescription={assignment?.description || ''}
            onSave={() => setShowStructure(false)} />
        </div>
      )}

      {showGrading && (
        <div className="mb-4">
          <GradingEditor assignmentId={assignmentId} initial={assignment?.gradingConfig}
            onSave={() => setShowGrading(false)} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4">
        {[['results', `Результати (${normal.length})`], ['failed', `Проблемні роботи (${failed.length})`]].map(([key, label]) => (
          <button key={key}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'results' && (
        normal.length === 0
          ? <p className="text-muted-foreground">Робіт не знайдено.</p>
          : <ResultsTable results={normal} navigate={navigate} downloadPdf={downloadPdf}
              notifyId={notifyId} setNotifyId={setNotifyId} message={message}
              setMessage={setMessage} notify={notify} review={review} />
      )}

      {tab === 'failed' && (
        failed.length === 0
          ? <p className="text-muted-foreground">Проблемних робіт немає.</p>
          : (
            <div className="flex flex-col gap-3">
              {failed.map(r => (
                <div key={r.submissionId} className="border rounded-lg p-4 bg-destructive/5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{r.student?.name || r.student?.email || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.status === 'too_large'
                        ? 'Файл занадто великий — студент має стиснути PDF або перездати меншим файлом'
                        : 'Не вдалося витягти текст — робота містить лише зображення або пошкоджений PDF'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => { setNotifyId(r.submissionId); setTab('results'); }}>
                    <Send className="h-3 w-3 mr-1" />Повідомити
                  </Button>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}
