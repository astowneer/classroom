import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const userData = params.get('user');
    if (token && userData) {
      login(token, JSON.parse(decodeURIComponent(userData)));
    }
  }, []);

  useEffect(() => {
    if (user) navigate(user.role === 'teacher' ? '/teacher/courses' : '/student/submissions');
  }, [user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Перевірка студентських робіт</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <a href="http://localhost:3000/api/auth/google?role=teacher">
              Увійти як викладач
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="http://localhost:3000/api/auth/google?role=student">
              Увійти як студент
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
