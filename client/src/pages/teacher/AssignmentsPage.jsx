import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RefreshCw, FileText, ChevronLeft } from 'lucide-react';

export default function AssignmentsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = () =>
    api.get('/assignments', { params: { courseId } })
      .then(r => setAssignments(r.data))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [courseId]);

  const sync = async () => {
    setSyncing(true);
    await api.post(`/assignments/sync/${courseId}`);
    await load();
    setSyncing(false);
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/courses')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">Завдання</h1>
        <Button size="sm" variant="outline" onClick={() => navigate(`/teacher/courses/${courseId}/students`)}>
          Студенти
        </Button>
        <Button onClick={sync} disabled={syncing} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Синхронізувати
        </Button>
      </div>
      {assignments.length === 0 ? (
        <p className="text-muted-foreground">Завдань не знайдено. Натисніть «Синхронізувати».</p>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map(a => (
            <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/teacher/assignments/${a.id}`)}>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{a.title}</CardTitle>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
