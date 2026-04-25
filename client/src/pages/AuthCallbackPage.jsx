import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Card';
import api from '../lib/api';

export default function AuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }

    localStorage.setItem('token', token);

    api.get('/auth/me')
      .then(r => {
        login(token, r.data);
        navigate(r.data.role === 'teacher' ? '/teacher/courses' : '/student/submissions', { replace: true });
      })
      .catch(err => {
        console.error('Auth callback error:', err.response?.data || err.message);
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
      });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-3">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">Вхід...</p>
    </div>
  );
}
