import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Play, Download, RefreshCw } from 'lucide-react';
import StructureEditor from '../../components/StructureEditor';
import GradingEditor from '../../components/GradingEditor';
import ExtractFieldsEditor from '../../components/ExtractFieldsEditor';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 5;

const statusLabel = s => ({
  pending: 'Очікує', text_extracted: 'Текст витягнуто', checked: 'Перевірено',
  failed: 'Помилка', resubmit_review: 'На розгляді', resubmit_accepted: 'Прийнято',
  resubmit_rejected: 'Відхилено', resubmit_checked: 'Самоперевірка',
}[s] || s);

const statusVariant = s => ({
  checked: 'success', failed: 'destructive', resubmit_review: 'warning',
  resubmit_accepted: 'success', resubmit_rejected: 'destructive',
}[s] || 'secondary');

function FailedTable({ failed, assignmentId, downloadOriginal, onRefresh }) {
  const [page, setPage] = useState(1);
  const [notifying, setNotifying] = useState(null);
  const [notified, setNotified] = useState(new Set());
  const paged = failed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const notify = async (r) => {
    setNotifying(r.submissionId);
    const msg = r.status === 'too_large'
      ? 'Ваша робота не може бути перевірена: файл занадто великий. Будь ласка, стисніть PDF або перездайте меншим файлом.'
      : 'Ваша робота не може бути перевірена: не вдалося витягти текст. PDF містить лише зображення. Будь ласка, перездайте роботу у форматі з текстовим шаром.';
    await api.post(`/submissions/${r.submissionId}/notify`, { message: msg });
    setNotified(prev => new Set([...prev, r.submissionId]));
    setNotifying(null);
  };

  const downloadList = () => {
    const lines = failed.map((r, i) => {
      const name = r.student?.name || r.student?.email || '—';
      const reason = r.status === 'too_large' ? 'файл занадто великий' : 'не вдалося витягти текст';
      return `${i + 1}. ${name} — ${reason}`;
    });
    const text = `Список студентів, чиї роботи не пройшли перевірку (${failed.length}):\n\n${lines.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `failed-submissions.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={downloadList}>
          <Download className="h-4 w-4 mr-2" />Завантажити список ({failed.length})
        </Button>
      </div>
      {paged.map(r => (
        <div key={r.submissionId} className="border rounded-lg p-4 bg-destructive/5 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{r.student?.name || r.student?.email || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {r.status === 'too_large'
                ? 'Файл занадто великий — студент має стиснути PDF або перездати меншим файлом'
                : 'Не вдалося витягти текст — робота містить лише зображення або пошкоджений PDF'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => downloadOriginal(r.submissionId)}
              title="Завантажити роботу студента">
              <Download className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline"
              disabled={notifying === r.submissionId || notified.has(r.submissionId) || r.sentToStudent}
              onClick={() => notify(r)}>
              {notified.has(r.submissionId) || r.sentToStudent ? 'Надіслано ✓' : notifying === r.submissionId ? '...' : 'Повідомити'}
            </Button>
          </div>
        </div>
      ))}
      <Pagination page={page} total={failed.length} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

function ResultsTable({ results, navigate, downloadOriginal, selected, setSelected }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const filter = {
    status:    searchParams.get('status') || '',
    plagiarism: searchParams.get('plagiarism') || '',
    grade:     searchParams.get('grade') || '',
  };
  const sortKey = searchParams.get('sort') || null;
  const sortDir = searchParams.get('dir') || 'desc';

  const setPage = (p) => setSearchParams(prev => { prev.set('page', p); return prev; }, { replace: true });
  const toggleSort = (key) => setSearchParams(prev => {
    const cur = prev.get('sort');
    const dir = cur === key && prev.get('dir') === 'desc' ? 'asc' : 'desc';
    prev.set('sort', key); prev.set('dir', dir); prev.set('page', '1');
    return prev;
  }, { replace: true });
  const setF = (key, val) => setSearchParams(prev => {
    val ? prev.set(key, val) : prev.delete(key);
    prev.set('page', '1');
    return prev;
  }, { replace: true });

  const filtered = results.filter(r => {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.plagiarism) {
      const score = parseFloat(r.plagiarismScore) || 0;
      if (filter.plagiarism === 'low'    && score >= 30) return false;
      if (filter.plagiarism === 'medium' && (score < 30 || score >= 70)) return false;
      if (filter.plagiarism === 'high'   && score < 70) return false;
    }
    if (filter.grade && r.grade) {
      const pct = r.grade.maxTotal > 0 ? r.grade.total / r.grade.maxTotal : 0;
      if (filter.grade === 'good'   && pct < 0.75) return false;
      if (filter.grade === 'medium' && (pct < 0.5 || pct >= 0.75)) return false;
      if (filter.grade === 'bad'    && pct >= 0.5) return false;
    }
    return true;
  });

  const allIds = filtered.map(r => r.submissionId);
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id));

  const sorted = sortKey ? [...filtered].sort((a, b) => {
    let va, vb;
    if (sortKey === 'plagiarism') { va = parseFloat(a.plagiarismScore) || 0; vb = parseFloat(b.plagiarismScore) || 0; }
    if (sortKey === 'grade')      { va = a.grade ? a.grade.total / (a.grade.maxTotal || 1) : -1; vb = b.grade ? b.grade.total / (b.grade.maxTotal || 1) : -1; }
    if (sortKey === 'date')       { va = new Date(a.submittedAt || 0); vb = new Date(b.submittedAt || 0); }
    return sortDir === 'desc' ? vb - va : va - vb;
  }) : filtered;

  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(allIds));
  };
  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap text-sm">
        <select className="border rounded px-2 py-1 text-sm" value={filter.status} onChange={e => setF('status', e.target.value)}>
          <option value="">Всі статуси</option>
          <option value="checked">Перевірено</option>
          <option value="pending">Очікує</option>
          <option value="failed">Помилка</option>
          <option value="too_large">Файл завеликий</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm" value={filter.plagiarism} onChange={e => setF('plagiarism', e.target.value)}>
          <option value="">Всі запозичення</option>
          <option value="low">До 30% (низьке)</option>
          <option value="medium">30–70% (середнє)</option>
          <option value="high">Від 70% (високе)</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm" value={filter.grade} onChange={e => setF('grade', e.target.value)}>
          <option value="">Всі оцінки</option>
          <option value="good">≥75% балів</option>
          <option value="medium">50–75% балів</option>
          <option value="bad">До 50% балів</option>
        </select>
        {(filter.status || filter.plagiarism || filter.grade) && (
          <button className="text-xs text-muted-foreground underline" onClick={() => setSearchParams({}, { replace: true })}>
            Скинути
          </button>
        )}
        <span className="text-muted-foreground text-xs self-center ml-auto">{filtered.length} з {results.length}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
            {[
              { label: 'Студент', key: null },
              { label: 'Статус', key: null },
              { label: 'Запозичення', key: 'plagiarism' },
              { label: 'Структура', key: null },
              { label: 'Оцінка', key: 'grade' },
              { label: 'Здано', key: 'date' },
              { label: 'Повід.', key: null },
              { label: 'Дії', key: null },
            ].map(({ label, key }) => (
              <th key={label} className={`px-4 py-3 text-left font-medium ${key ? 'cursor-pointer select-none hover:bg-muted' : ''}`}
                onClick={() => key && toggleSort(key)}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.map(r => (
            <tr key={r.submissionId} className="border-t hover:bg-muted/20">
              <td className="px-3 py-3"><input type="checkbox" checked={selected.has(r.submissionId)} onChange={() => toggle(r.submissionId)} /></td>
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
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/reports/${r.submissionId}`)}>Звіт</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadOriginal(r.submissionId)}>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </div>
  );
}

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const tab = searchParams.get('tab') || 'results';
  const setTab = (t) => setSearchParams(prev => { prev.set('tab', t); return prev; }, { replace: true });
  const [selected, setSelected] = useState(new Set());
  const downloadOriginal = async (submissionId) => {
    const res = await api.get(`/submissions/${submissionId}/file`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `submission-${submissionId}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

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
  const [checkError, setCheckError] = useState(null);

  const runCheck = async () => {
    setChecking(true); setCheckError(null);
    try { await api.post(`/submissions/check/${assignmentId}`); }
    catch (err) { setCheckError(err.response?.data?.error || 'Помилка перевірки'); }
    await load(); setChecking(false);
  };
  const runCheckSelected = async () => {
    if (!selected.size) return;
    setChecking(true); setCheckError(null);
    try { await api.post('/submissions/check-selected', { submissionIds: [...selected], assignmentId: parseInt(assignmentId) }); }
    catch (err) { setCheckError(err.response?.data?.error || 'Помилка перевірки'); }
    setSelected(new Set());
    await load();
    setChecking(false);
  };
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
        {selected.size > 0 && (
          <Button size="sm" variant="outline" onClick={runCheckSelected} disabled={checking}>
            <Play className="h-4 w-4 mr-2" />Перевірити вибрані ({selected.size})
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowStructure(s => !s)}>
          {showStructure ? 'Сховати структуру' : 'Налаштувати структуру'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowGrading(s => !s)}>
          {showGrading ? 'Сховати оцінювання' : 'Налаштувати оцінювання'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowExtract(s => !s)}>
          {showExtract ? 'Сховати поля' : 'Поля витягування'}
        </Button>
      </div>

      {checkError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
          {checkError}
        </div>
      )}

      {showStructure && (
        <div className="mb-4">
          <StructureEditor assignmentId={assignmentId} initial={assignment?.structureRequirements || []}
            initialMinLength={assignment?.minTextLength ?? 100}
            initialDescription={assignment?.description || ''}
            initialStopPhrases={assignment?.stopPhrases || []}
            onSave={() => setShowStructure(false)} />
        </div>
      )}

      {showGrading && (
        <div className="mb-4">
          <GradingEditor assignmentId={assignmentId} initial={assignment?.gradingConfig}
            onSave={() => setShowGrading(false)} />
        </div>
      )}

      {showExtract && (
        <div className="mb-4">
          <ExtractFieldsEditor assignmentId={assignmentId} initial={assignment?.extractFields || []}
            onSave={() => setShowExtract(false)} />
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
          : <ResultsTable results={normal} navigate={navigate} downloadOriginal={downloadOriginal}
              selected={selected} setSelected={setSelected} />
      )}

      {tab === 'failed' && (
        failed.length === 0
          ? <p className="text-muted-foreground">Проблемних робіт немає.</p>
          : <FailedTable failed={failed} assignmentId={assignmentId} downloadOriginal={downloadOriginal} onRefresh={load} />
      )}
    </div>
  );
}
