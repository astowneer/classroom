import { useRef } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Card';
import { Download, Printer } from 'lucide-react';

const COLORS = ['#fde68a', '#bbf7d0', '#fecaca', '#bfdbfe', '#fed7aa', '#e9d5ff', '#d1fae5'];

function buildHighlights(fullText, plagiarismMatches) {
  const ranges = [];
  plagiarismMatches.forEach((match, idx) => {
    const color = COLORS[idx % COLORS.length];
    const studentName = match.studentName || `#${match.sourceSubmissionId}`;
    for (const m of (match.matches || [])) {
      if (!m.textB) continue;
      const words = m.textB.split(/\s+/).filter(Boolean);
      if (words.length < 2) continue;
      const pattern = new RegExp(
        words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^\\wа-яіїєґ]*'),
        'i'
      );
      const found = pattern.exec(fullText);
      if (found) ranges.push({ start: found.index, end: found.index + found[0].length, color, studentName });
    }
  });
  return ranges.sort((a, b) => a.start - b.start);
}

function HighlightedText({ text, ranges }) {
  if (!text) return null;
  if (!ranges.length) return <span className="whitespace-pre-wrap text-sm">{text}</span>;

  // Merge overlapping ranges
  const merged = [];
  for (const r of ranges) {
    if (merged.length && r.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else merged.push({ ...r });
  }

  const segments = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) segments.push({ text: text.slice(cursor, r.start), color: null, studentName: null });
    segments.push({ text: text.slice(r.start, r.end), color: r.color, studentName: r.studentName });
    cursor = r.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), color: null });

  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((s, i) =>
        s.color
          ? <mark key={i} style={{ backgroundColor: s.color, borderRadius: 2, padding: '0 2px' }}
              title={`Збіг з: ${s.studentName}`}>{s.text}</mark>
          : <span key={i}>{s.text}</span>
      )}
    </span>
  );
}

export default function ReportView({ report, submission, student, assignment }) {
  const ref = useRef();

  const { structureResult, plagiarismMatches = [], grammarResult, completenessResult } = report.details || {};
  const fullText = submission?.extractedText || '';
  const ranges = buildHighlights(fullText, plagiarismMatches);

  const downloadPdf = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({
      margin: 10,
      filename: `report-${submission?.id}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(ref.current).save();
  };

  const legend = plagiarismMatches.map((m, idx) => ({
    color: COLORS[idx % COLORS.length],
    name: m.studentName || `#${m.sourceSubmissionId}`,
    similarity: m.similarity,
    count: m.matches?.length ?? 0,
  }));

  return (
    <div>
      <div className="flex gap-2 mb-4 print:hidden">
        <Button size="sm" variant="outline" onClick={downloadPdf}>
          <Download className="h-4 w-4 mr-2" />Завантажити PDF
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />Друк
        </Button>
      </div>

      <div ref={ref} className="bg-white p-6 rounded-lg border text-sm font-sans">
        {/* Header */}
        <h1 className="text-xl font-bold text-center mb-4">Звіт перевірки роботи</h1>
        <div className="grid grid-cols-2 gap-2 mb-6 text-sm border-b pb-4">
          <div><span className="text-gray-500">Студент:</span> {student?.name || student?.email}</div>
          <div><span className="text-gray-500">Завдання:</span> {assignment?.title}</div>
          <div><span className="text-gray-500">Дата здачі:</span> {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString('uk-UA') : '—'}</div>
          <div><span className="text-gray-500">Статус:</span> {submission?.status}</div>
        </div>

        {/* Grade */}
        {report.grade && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-semibold mb-2">Оцінка: {report.grade.total} / {report.grade.maxTotal}</h2>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(report.grade.breakdown).map(([k, v]) => {
                const labels = { plagiarism: 'Запозичення', structure: 'Структура', completeness: 'Повнота теми', grammar: 'Граматика' };
                return <div key={k}>{labels[k] || k}: <b>{v.score}/{v.max}</b></div>;
              })}
            </div>
          </div>
        )}

        {/* Plagiarism */}
        <div className="mb-6">
          <h2 className="font-semibold text-base mb-2">Запозичення: {report.plagiarismScore != null ? `${(report.plagiarismScore * 100).toFixed(1)}%` : '—'}</h2>
          {legend.length === 0
            ? <p className="text-green-700 text-sm">Запозичень не виявлено</p>
            : (
              <div className="flex flex-col gap-1 mb-3">
                {legend.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span style={{ backgroundColor: l.color, width: 14, height: 14, borderRadius: 2, display: 'inline-block' }} />
                    {l.name} — {(l.similarity * 100).toFixed(1)}% ({l.count} збігів)
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Structure */}
        <div className="mb-6">
          <h2 className="font-semibold text-base mb-2">
            Структура: {structureResult?.passed ? '✓ Пройдено' : '✗ Не пройдено'}
            {structureResult?.score != null && ` (${structureResult.score}%)`}
          </h2>
          {structureResult?.missing?.length > 0 && <p className="text-red-600 text-xs">Відсутні: {structureResult.missing.join(', ')}</p>}
          {structureResult?.duplicates?.length > 0 && <p className="text-yellow-600 text-xs">Дублікати: {structureResult.duplicates.join(', ')}</p>}
          {structureResult?.orderViolations?.length > 0 && <p className="text-yellow-600 text-xs">Порушення порядку: {structureResult.orderViolations.join('; ')}</p>}
          {structureResult?.emptySections?.length > 0 && (
            <p className="text-yellow-600 text-xs">Недостатній обсяг: {structureResult.emptySections.map(s => typeof s === 'object' ? `${s.name} (${s.wordCount}/${s.required} сл.)` : s).join(', ')}</p>
          )}
        </div>

        {/* Completeness */}
        {completenessResult && (
          <div className="mb-6">
            <h2 className="font-semibold text-base mb-1">Повнота теми: {completenessResult.score != null ? `${(completenessResult.score * 100).toFixed(1)}%` : '—'}</h2>
            <p className="text-xs text-gray-600">{completenessResult.label}</p>
          </div>
        )}

        {/* Grammar */}
        {grammarResult && (
          <div className="mb-6">
            <h2 className="font-semibold text-base mb-2">Граматика: {grammarResult.errorCount} помилок</h2>
            {grammarResult.errors?.slice(0, 15).map((e, i) => (
              <div key={i} className="mb-1 text-xs border-l-2 border-yellow-400 pl-2">
                <span className="font-medium">{e.message}</span>
                <span className="text-gray-500 ml-1">«{e.context?.substring(0, 80)}»</span>
                {e.replacements?.length > 0 && <span className="text-blue-600 ml-1">→ {e.replacements.join(', ')}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Full text with highlights */}
        <div>
          <h2 className="font-semibold text-base mb-3">Текст роботи</h2>
          <div className="border rounded p-4 bg-gray-50 leading-relaxed">
            <HighlightedText text={fullText} ranges={ranges} />
          </div>
        </div>
      </div>
    </div>
  );
}
