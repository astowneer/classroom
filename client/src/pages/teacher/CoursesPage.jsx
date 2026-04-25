import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RefreshCw, BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get('/courses').then(r => setCourses(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncing(true);
    await api.post('/courses/sync');
    await load();
    setSyncing(false);
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Курси</h1>
        <Button onClick={sync} disabled={syncing} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Синхронізувати
        </Button>
      </div>
      {courses.length === 0 ? (
        <p className="text-muted-foreground">Курсів не знайдено. Натисніть «Синхронізувати».</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <Card key={course.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/teacher/courses/${course.id}/assignments`)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{course.name}</CardTitle>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
