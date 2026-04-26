import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronRight } from 'lucide-react';

const statusLabel = s => ({
  pending: 'Очікує перевірки', text_extracted: 'Текст витягнуто', checked: 'Перевірено',
  failed: 'Помилка — перездайте', too_large: 'Файл занадто великий',
  resubmit_pending: 'Завантажено', resubmit_checked: 'Самоперевірка виконана',
  resubmit_review: 'На розгляді', resubmit_accepted: 'Прийнято', resubmit_rejected: 'Відхилено',
}[s] || s);

const statusVariant = s => ({
  checked: 'success', failed: 'destructive', too_large: 'destructive',
  resubmit_accepted: 'success', resubmit_rejected: 'destructive', resubmit_review: 'warning',
}[s] || 'secondary');

export default function StudentSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/submissions').then(r => setSubmissions(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  // Group by course → assignment
  const grouped = {};
  for (const s of submissions) {
    const courseName = s.assignment?.course?.name || 'Без курсу';
    const assignmentTitle = s.assignment?.title || 'Без завдання';
    if (!grouped[courseName]) grouped[courseName] = {};
    if (!grouped[courseName][assignmentTitle]) grouped[courseName][assignmentTitle] = [];
    grouped[courseName][assignmentTitle].push(s);
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Мої роботи</h1>
        <p className="text-muted-foreground">Робіт не знайдено.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Мої роботи</h1>
      {Object.entries(grouped).map(([course, assignments]) => (
        <div key={course} className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-primary">{course}</h2>
          {Object.entries(assignments).map(([assignment, subs]) => (
            <div key={assignment} className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 pl-1">{assignment}</h3>
              <div className="flex flex-col gap-2">
                {subs.map(s => (
                  <div key={s.id} className="border rounded-lg px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div>
                      <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                      <span className="text-xs text-muted-foreground ml-3">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('uk-UA') : '—'}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/student/submissions/${s.id}`)}>
                      Деталі <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
