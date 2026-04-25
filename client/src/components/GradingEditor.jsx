import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import api from '../lib/api';

const DEFAULT_CONFIG = {
  plagiarism:   { max: 4, thresholds: [{ limit: 0.1, score: 4 }, { limit: 0.3, score: 2 }, { limit: 1, score: 0 }] },
  structure:    { max: 3 },
  completeness: { max: 2 },
  grammar:      { max: 1, thresholds: [{ limit: 5, score: 1 }, { limit: 20, score: 0.5 }, { limit: 999, score: 0 }] },
};

function CriterionRow({ label, value, onChange, showThresholds, thresholds, onThresholdChange }) {
  return (
    <div className="border rounded-md p-3 flex flex-col gap-2 bg-muted/20">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-36">{label}</span>
        <label className="text-xs flex items-center gap-1">
          Макс. балів:
          <input type="number" min="0" max="100" step="0.5"
            className="border rounded px-2 py-0.5 w-16 text-sm"
            value={value}
            onChange={e => onChange(parseFloat(e.target.value) || 0)} />
        </label>
      </div>
      {showThresholds && thresholds && (
        <div className="flex flex-col gap-1 pl-2">
          <span className="text-xs text-muted-foreground">Пороги (якщо значення ≤ ліміту → бал):</span>
          {thresholds.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span>≤</span>
              <input type="number" step="0.01" className="border rounded px-1 py-0.5 w-16"
                value={t.limit} onChange={e => onThresholdChange(i, 'limit', parseFloat(e.target.value))} />
              <span>→</span>
              <input type="number" step="0.5" className="border rounded px-1 py-0.5 w-16"
                value={t.score} onChange={e => onThresholdChange(i, 'score', parseFloat(e.target.value))} />
              <span className="text-muted-foreground">балів</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GradingEditor({ assignmentId, initial, onSave }) {
  const [config, setConfig] = useState(initial || DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  const setMax = (key, val) => setConfig(c => ({ ...c, [key]: { ...c[key], max: val } }));
  const setThreshold = (key, i, field, val) => setConfig(c => ({
    ...c,
    [key]: {
      ...c[key],
      thresholds: c[key].thresholds.map((t, idx) => idx === i ? { ...t, [field]: val } : t),
    },
  }));

  const maxTotal = Object.values(config).reduce((s, v) => s + (v?.max || 0), 0);

  const save = async () => {
    setSaving(true);
    await api.put(`/assignments/${assignmentId}/grading`, config);
    setSaving(false);
    onSave?.(config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Налаштування оцінювання
          <span className="text-sm font-normal text-muted-foreground">Максимум: {maxTotal} балів</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CriterionRow label="Запозичення"
          value={config.plagiarism?.max ?? 4}
          onChange={v => setMax('plagiarism', v)}
          showThresholds thresholds={config.plagiarism?.thresholds}
          onThresholdChange={(i, f, v) => setThreshold('plagiarism', i, f, v)} />

        <CriterionRow label="Структура"
          value={config.structure?.max ?? 3}
          onChange={v => setMax('structure', v)}
          showThresholds={false} />

        <CriterionRow label="Повнота теми"
          value={config.completeness?.max ?? 2}
          onChange={v => setMax('completeness', v)}
          showThresholds={false} />

        <CriterionRow label="Граматика"
          value={config.grammar?.max ?? 1}
          onChange={v => setMax('grammar', v)}
          showThresholds thresholds={config.grammar?.thresholds}
          onThresholdChange={(i, f, v) => setThreshold('grammar', i, f, v)} />

        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Збереження...' : 'Зберегти'}
        </Button>
      </CardContent>
    </Card>
  );
}
