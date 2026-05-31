import { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Card';
import { Download } from 'lucide-react';

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

      const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Find start using first 3 words
      const startPat = new RegExp(words.slice(0, 3).map(esc).join('[^\\wа-яіїєґ]*'), 'i');
      const startM = startPat.exec(fullText);
      if (!startM) continue;

      // Find end using last 3 words, searching from start position
      const endPat = new RegExp(words.slice(-3).map(esc).join('[^\\wа-яіїєґ]*'), 'i');
      const tail = fullText.slice(startM.index);
      const endM = endPat.exec(tail);

      const start = startM.index;
      const end = endM ? startM.index + endM.index + endM[0].length : startM.index + startM[0].length;

      if (end > start) ranges.push({ start, end, color, studentName });
    }
  });
  return ranges.sort((a, b) => a.start - b.start);
}

// Find all positions of stop phrases in text
function buildStopRanges(text, stopPhrases) {
  const ranges = [];
  for (const phrase of stopPhrases) {
    if (!phrase.trim()) continue;
    const pattern = new RegExp(phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let m;
    while ((m = pattern.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return ranges;
}

// Remove stop ranges from highlight ranges (split or trim highlights around stop phrases)
function subtractRanges(highlights, stopRanges) {
  if (!stopRanges.length) return highlights;
  const result = [];
  for (const h of highlights) {
    let segments = [{ ...h }];
    for (const s of stopRanges) {
      const next = [];
      for (const seg of segments) {
        if (s.end <= seg.start || s.start >= seg.end) {
          next.push(seg); // no overlap
        } else {
          if (s.start > seg.start) next.push({ ...seg, end: s.start }); // left part
          if (s.end < seg.end)   next.push({ ...seg, start: s.end });   // right part
        }
      }
      segments = next;
    }
    result.push(...segments.filter(s => s.end > s.start));
  }
  return result;
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

function FullTextSection({ fullText, ranges, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id="full-text-section">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 font-semibold text-base mb-2 hover:text-gray-600 w-full text-left">
        <span>{open ? '▾' : '▸'}</span> Текст роботи
      </button>
      {open && (
        <div className="border rounded p-4 bg-gray-50 leading-relaxed">
          <HighlightedText text={fullText} ranges={ranges} />
        </div>
      )}
    </div>
  );
}

export default function ReportView({ report, submission, student, assignment }) {
  const ref = useRef();
  const stopPhrases = assignment?.stopPhrases || [];
  const { structureResult, plagiarismMatches = [], grammarResult, completenessResult } = report.details || {};
  // Use originalText for display if available (preserves pre-resubmission text)
  const fullText = submission?.originalText || submission?.extractedText || '';

  // Build highlights then subtract stop phrase ranges
  const rawRanges = buildHighlights(fullText, plagiarismMatches);
  const stopRanges = buildStopRanges(fullText, stopPhrases);
  const ranges = subtractRanges(rawRanges, stopRanges);

  const downloadPdf = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    // Expand full text section if collapsed
    const textSection = ref.current.querySelector('#full-text-section');
    const textContent = textSection?.querySelector('.border.rounded.p-4');
    const wasHidden = textSection && !textContent;
    if (wasHidden) textSection.querySelector('button')?.click();
    // Small delay to let React re-render
    await new Promise(r => setTimeout(r, 100));
    // Hide elements not needed in PDF
    const noPrint = ref.current.querySelectorAll('.no-print');
    noPrint.forEach(el => el.style.display = 'none');
    await html2pdf().set({
      margin: 10,
      filename: `report-${submission?.id}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(ref.current).save();
    noPrint.forEach(el => el.style.display = '');
    // Collapse back if it was hidden
    if (wasHidden) textSection.querySelector('button')?.click();
  };

  const legend = plagiarismMatches.map((m, idx) => ({
    color: COLORS[idx % COLORS.length],
    name: m.studentName || `#${m.sourceSubmissionId}`,
    similarity: m.similarity,
    count: m.matches?.length ?? 0,
    sourceSubmissionId: m.sourceSubmissionId,
  }));

  return (
    <div>
      <div className="flex gap-2 mb-4 print:hidden">
        <Button size="sm" variant="outline" onClick={downloadPdf}>
          <Download className="h-4 w-4 mr-2" />Завантажити PDF
        </Button>
      </div>

      <div ref={ref} className="bg-white p-6 rounded-lg border text-sm font-sans">
        {/* Header */}
        <h1 className="text-xl font-bold text-center mb-4">Звіт перевірки роботи</h1>
        {(() => {
          const extractedVariant = report.extractedFields
            ? Object.entries(report.extractedFields).find(([k]) => /варіант/i.test(k))?.[1]
            : null;
          const studentVariant = student?.variant;
          const mismatch = extractedVariant && studentVariant &&
            String(extractedVariant).trim() !== String(studentVariant).trim();
          return (
            <div className="grid grid-cols-2 gap-2 mb-6 text-sm border-b pb-4">
              <div><span className="text-gray-500">Студент:</span> {student?.name || student?.email}</div>
              <div><span className="text-gray-500">Завдання:</span> {assignment?.title}</div>
              <div><span className="text-gray-500">Дата здачі:</span> {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString('uk-UA') : '—'}</div>
              <div><span className="text-gray-500">Статус:</span> {submission?.status}</div>
              {studentVariant && (
                <div className={`col-span-2${mismatch ? ' bg-red-50 border border-red-300 rounded px-2 py-1' : ''}`}>
                  <span className="text-gray-500">Варіант студента:</span>{' '}
                  <b className={mismatch ? 'text-red-600' : ''}>{studentVariant}</b>
                  {mismatch && (
                    <span className="text-red-600 ml-2 text-xs">⚠ не збігається з текстом роботи ({extractedVariant})</span>
                  )}
                </div>
              )}
              {report.extractedFields && Object.entries(report.extractedFields).map(([k, v]) => v && (
                <div key={k}><span className="text-gray-500">{k}:</span> <b>{v}</b></div>
              ))}
            </div>
          );
        })()}

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
              <div className="flex flex-col gap-2 mb-3">
                {legend.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs border rounded p-2">
                    <span style={{ backgroundColor: l.color, width: 14, height: 14, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
                    <div className="flex-1">
                      <span className="font-medium">{l.name}</span>
                      <span className="text-gray-500 ml-2">— {(l.similarity * 100).toFixed(1)}% ({l.count} збігів)</span>
                    </div>
                    {l.sourceSubmissionId && (
                      <a href={`/teacher/reports/${l.sourceSubmissionId}`}
                        className="text-blue-600 underline text-xs ml-auto flex-shrink-0 print:hidden no-print">
                        Переглянути роботу →
                      </a>
                    )}
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
        <FullTextSection fullText={fullText} ranges={ranges} />
      </div>
    </div>
  );
}
