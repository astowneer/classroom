import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import api from '../lib/api';

const empty = () => ({ name: '', aliases: '', required: true, forbidden: false, minWords: '' });

export default function StructureEditor({ assignmentId, initial = [], initialMinLength = 100, initialDescription = '', onSave }) {
  const [sections, setSections] = useState(
    initial.length ? initial.map(s =>
      typeof s === 'string'
        ? { name: s, aliases: '', required: true, forbidden: false, minWords: '' }
        : { ...s, aliases: (s.aliases || []).join(', '), minWords: s.minWords || '' }
    ) : [empty()]
  );
  const [minTextLength, setMinTextLength] = useState(initialMinLength);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  const update = (i, field, value) =>
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const save = async () => {
    setSaving(true);
    const payload = sections
      .filter(s => s.name.trim())
      .map(s => ({
        name: s.name.trim(),
        aliases: s.aliases ? s.aliases.split(',').map(a => a.trim()).filter(Boolean) : [],
        required: s.required,
        forbidden: s.forbidden,
        ...(s.minWords ? { minWords: parseInt(s.minWords) } : {}),
      }));
    await Promise.all([
      api.put(`/assignments/${assignmentId}/structure`, { sections: payload }),
      api.put(`/assignments/${assignmentId}/settings`, { minTextLength: parseInt(minTextLength) || 100, description }),
    ]);
    setSaving(false);
    onSave?.(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Вимоги до структури</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* General settings */}
        <div className="flex gap-4 pb-3 border-b">
          <label className="flex flex-col gap-1 text-xs">
            Мінімум символів у роботі
            <input type="number" min="0" className="border rounded px-2 py-1 w-32 text-sm"
              value={minTextLength} onChange={e => setMinTextLength(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs flex-1">
            Опис завдання (для перевірки повноти теми)
            <textarea className="border rounded px-2 py-1 text-sm resize-none" rows={2}
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Опишіть що має бути в роботі..." />
          </label>
        </div>
        {sections.map((s, i) => (
          <div key={i} className="border rounded-md p-3 flex flex-col gap-2 bg-muted/20">
            <div className="flex gap-2 items-center">
              <input
                className="border rounded px-2 py-1 text-sm flex-1"
                placeholder="Назва розділу (напр. Вступ)"
                value={s.name}
                onChange={e => update(i, 'name', e.target.value)}
              />
              <Button size="sm" variant="ghost" onClick={() => setSections(prev => prev.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <input
              className="border rounded px-2 py-1 text-xs"
              placeholder="Альтернативні назви через кому (напр. Висновки, ВИСНОВОК)"
              value={s.aliases}
              onChange={e => update(i, 'aliases', e.target.value)}
            />
            <div className="flex gap-4 items-center text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={s.required} onChange={e => update(i, 'required', e.target.checked)} />
                Обов'язковий
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={s.forbidden} onChange={e => update(i, 'forbidden', e.target.checked)} />
                Заборонений
              </label>
              <label className="flex items-center gap-1">
                Мін. слів:
                <input
                  type="number" min="0"
                  className="border rounded px-1 py-0.5 w-16 text-xs"
                  value={s.minWords}
                  onChange={e => update(i, 'minWords', e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setSections(prev => [...prev, empty()])}>
            <Plus className="h-4 w-4 mr-1" />Додати розділ
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Збереження...' : 'Зберегти'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
