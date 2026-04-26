import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import api from '../lib/api';

const PRESETS = [
  { label: 'Варіант', pattern: 'варіант\\s*[№#]?\\s*(\\d+)' },
  { label: 'Виконав', pattern: 'виконав\\w*\\s+([А-ЯІЇЄҐ][а-яіїєґ]+\\s+[А-ЯІЇЄҐ][а-яіїєґ]+(?:\\s+[А-ЯІЇЄҐ][а-яіїєґ]+)?)' },
  { label: 'Група', pattern: 'група\\s+([А-ЯA-Z]{2,}-\\d+)' },
];

export default function ExtractFieldsEditor({ assignmentId, initial = [], onSave }) {
  const [fields, setFields] = useState(initial.length ? initial : [{ label: '', pattern: '' }]);
  const [saving, setSaving] = useState(false);
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState(null);

  const update = (i, key, val) =>
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f));

  const addPreset = (preset) => setFields(prev => [...prev, { ...preset }]);

  const test = () => {
    if (!testText.trim()) return;
    const results = {};
    for (const { label, pattern, maxLength } of fields) {
      if (!label || !pattern) continue;
      try {
        const m = new RegExp(pattern, 'i').exec(testText);
        let val = m ? (m[1] ?? m[0]).trim() : 'не знайдено';
        if (val !== 'не знайдено' && maxLength) val = val.slice(0, maxLength).trim();
        results[label] = val;
      } catch {
        results[label] = 'невірний regex';
      }
    }
    setTestResults(results);
  };

  const save = async () => {
    setSaving(true);
    await api.put(`/assignments/${assignmentId}/extract-fields`, {
      fields: fields.filter(f => f.label && f.pattern),
    });
    setSaving(false);
    onSave?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Поля для витягування з роботи</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Задайте назву поля і regex-патерн. Перша група захоплення <code className="bg-muted px-1 rounded">(…)</code> буде значенням.
        </p>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground self-center">Шаблони:</span>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => addPreset(p)}
              className="text-xs border rounded px-2 py-0.5 hover:bg-accent">
              + {p.label}
            </button>
          ))}
        </div>

        {fields.map((f, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className="border rounded px-2 py-1 text-sm w-28 flex-shrink-0"
              placeholder="Назва" value={f.label}
              onChange={e => update(i, 'label', e.target.value)} />
            <input className="border rounded px-2 py-1 text-sm flex-1 font-mono text-xs"
              placeholder="regex патерн, напр: варіант\s*(\d+)"
              value={f.pattern}
              onChange={e => update(i, 'pattern', e.target.value)} />
            <input type="number" min="1" className="border rounded px-2 py-1 text-sm w-16 flex-shrink-0"
              placeholder="макс" title="Максимум символів"
              value={f.maxLength || ''}
              onChange={e => update(i, 'maxLength', e.target.value ? parseInt(e.target.value) : undefined)} />
            <Button size="sm" variant="ghost"
              onClick={() => setFields(prev => prev.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <Button size="sm" variant="outline" onClick={() => setFields(prev => [...prev, { label: '', pattern: '' }])}>
          <Plus className="h-4 w-4 mr-1" />Додати поле
        </Button>

        {/* Test area */}
        <div className="border-t pt-3 flex flex-col gap-2">
          <span className="text-xs font-medium">Тест (вставте фрагмент тексту роботи):</span>
          <textarea className="border rounded px-2 py-1 text-xs resize-none" rows={3}
            value={testText} onChange={e => { setTestText(e.target.value); setTestResults(null); }}
            placeholder="Вставте текст для перевірки патернів..." />
          <Button size="sm" variant="outline" onClick={test} disabled={!testText.trim()}>Перевірити</Button>
          {testResults && (
            <div className="bg-muted/30 rounded p-2 text-xs flex flex-col gap-1">
              {Object.entries(testResults).map(([k, v]) => (
                <div key={k}><span className="font-medium">{k}:</span> <span className={v === 'не знайдено' ? 'text-destructive' : 'text-green-700'}>{v}</span></div>
              ))}
            </div>
          )}
        </div>

        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Збереження...' : 'Зберегти'}
        </Button>
      </CardContent>
    </Card>
  );
}
