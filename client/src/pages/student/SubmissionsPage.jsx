import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText } from 'lucide-react';

const statusLabel = s => ({
  pending: 'Очікує перевірки', text_extracted: 'Текст витягнуто', checked: 'Перевірено',
  failed: 'Помилка — перездайте', resubmit_pending: 'Завантажено', resubmit_checked: 'Самоперевірка виконана',
  resubmit_review: 'На розгляді у викладача', resubmit_accepted: 'Прийнято', resubmit_rejected: 'Відхилено',
}[s] || s);

const statusVariant = s => ({
  checked: 'success', failed: 'destructive', resubmit_accepted: 'success',
  resubmit_rejected: 'destructive', resubmit_review: 'warning',
}[s] || 'secondary');

export default function StudentSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/submissions').then(r => setSubmissions(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Мої роботи</h1>
      {submissions.length === 0 ? (
        <p className="text-muted-foreground">Робіт не знайдено.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map(s => (
            <Card key={s.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <CardTitle className="text-base">Робота #{s.id}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('uk-UA') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                    <Button size="sm" variant="outline"
                      onClick={() => navigate(`/student/submissions/${s.id}`)}>
                      Деталі
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
