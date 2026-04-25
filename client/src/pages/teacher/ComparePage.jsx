import { useState, useRef } from 'react';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Card';
import { Upload, Play } from 'lucide-react';

const HIGHLIGHT_COLOR = '#fde68a'; // amber-200

function HighlightedText({ text, matches, side }) {
  if (!text) return <span className="text-muted-foreground text-sm">Текст відсутній</span>;
  if (!matches?.length) return <span className="text-sm whitespace-pre-wrap">{text}</span>;

  // Collect all ranges for this side, including duplicate occurrences
  const ranges = [];
  for (const m of matches) {
    const occurrences = side === 'A' ? (m.allInA || [m.inA]) : (m.allInB || [m.inB]);
    for (const r of occurrences) {
      if (r.start >= 0 && r.end > r.start) ranges.push(r);
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  // Merge overlapping ranges
  const merged = [];
  for (const r of ranges) {
    if (merged.length && r.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const segments = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) segments.push({ text: text.slice(cursor, r.start), highlight: false });
    segments.push({ text: text.slice(r.start, r.end), highlight: true });
    cursor = r.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false });

  return (
    <span className="text-sm whitespace-pre-wrap">
      {segments.map((s, i) =>
        s.highlight
          ? <mark key={i} style={{ backgroundColor: HIGHLIGHT_COLOR }} className="rounded px-0.5">{s.text}</mark>
          : <span key={i}>{s.text}</span>
      )}
    </span>
  );
}

export default function ComparePage() {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [matches, setMatches] = useState(null);
  const [similarity, setSimilarity] = useState(null);
  const [docSimilarity, setDocSimilarity] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileARef = useRef();
  const fileBRef = useRef();

  const extractPdf = async (file, setter) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/compare/extract', form);
    setter(res.data.text);
  };

  const compare = async () => {
    if (!textA.trim() || !textB.trim()) return;
    setLoading(true);
    const res = await api.post('/compare', { textA, textB });
    setMatches(res.data.matches);
    setSimilarity(res.data.similarity);
    setDocSimilarity(res.data.docSimilarity);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Порівняння текстів</h1>
        {similarity !== null && (
          <div className="flex gap-4 items-center">
            <div className={`text-lg font-bold ${similarity > 0.3 ? 'text-destructive' : 'text-green-700'}`}>
              Збіг речень: {(similarity * 100).toFixed(1)}%
              {matches && <span className="text-sm font-normal text-muted-foreground ml-2">({matches.length} фрагментів)</span>}
            </div>
            {docSimilarity !== null && (
              <div className="text-sm text-muted-foreground">
                Збіг документів: {(docSimilarity * 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { label: 'Робота A (оригінал)', text: textA, setText: setTextA, fileRef: fileARef, side: 'A' },
          { label: 'Робота B (перевіряється)', text: textB, setText: setTextB, fileRef: fileBRef, side: 'B' },
        ].map(({ label, text, setText, fileRef, side }) => (
          <div key={side} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex gap-1">
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => e.target.files[0] && extractPdf(e.target.files[0], setText)} />
                <Button size="sm" variant="outline" onClick={() => fileRef.current.click()}>
                  <Upload className="h-3 w-3 mr-1" />PDF
                </Button>
              </div>
            </div>
            <div className="relative border rounded-lg overflow-hidden" style={{ height: 400 }}>
              {matches
                ? <div className="p-3 overflow-y-auto h-full">
                    <HighlightedText text={text} matches={matches} side={side} />
                  </div>
                : <textarea
                    className="w-full h-full p-3 text-sm resize-none focus:outline-none"
                    placeholder="Вставте текст або завантажте PDF..."
                    value={text}
                    onChange={e => { setText(e.target.value); setMatches(null); }}
                  />
              }
            </div>
            {matches && (
              <Button size="sm" variant="ghost" onClick={() => setMatches(null)}>
                Редагувати текст
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={compare} disabled={loading || !textA.trim() || !textB.trim()}>
          {loading ? <><Spinner className="h-4 w-4 mr-2" />Порівняння...</> : <><Play className="h-4 w-4 mr-2" />Порівняти</>}
        </Button>
      </div>
    </div>
  );
}
