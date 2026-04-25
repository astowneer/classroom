import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Pencil, Check, X } from 'lucide-react';

export default function StudentsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/users/course/${courseId}/students`)
      .then(r => setStudents(r.data))
      .finally(() => setLoading(false));
  }, [courseId]);

  const startEdit = (s) => { setEditId(s.id); setEditName(s.name || ''); };
  const cancelEdit = () => { setEditId(null); setEditName(''); };

  const saveName = async (id) => {
    setSaving(true);
    const res = await api.patch(`/users/${id}/name`, { name: editName });
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name: res.data.name } : s));
    setEditId(null);
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Студенти курсу</h1>
      </div>

      {students.length === 0 ? (
        <p className="text-muted-foreground">Студентів не знайдено. Спочатку синхронізуйте роботи.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map(s => (
            <Card key={s.id}>
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {editId === s.id ? (
                    <input
                      className="border rounded px-2 py-1 text-sm w-full"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveName(s.id)}
                      autoFocus
                      placeholder="Прізвище Ім'я По-батькові"
                    />
                  ) : (
                    <>
                      <p className="font-medium text-sm">{s.name || <span className="text-muted-foreground italic">Ім'я не вказано</span>}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {editId === s.id ? (
                    <>
                      <Button size="sm" onClick={() => saveName(s.id)} disabled={saving}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
