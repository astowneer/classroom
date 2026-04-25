import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Spinner } from './ui/Card';
import { BookOpen, FileText, Bell, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';

function useTotalUnread() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetch = () =>
      api.get('/messages/unread')
        .then(r => setCount(r.data.reduce((s, x) => s + parseInt(x.count), 0)))
        .catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);
  return count;
}

export function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const unread = useTotalUnread();

  const teacherLinks = [
    { to: '/teacher/courses', label: 'Курси', icon: BookOpen },
    { to: '/teacher/notifications', label: 'Сповіщення', icon: Bell, badge: unread },
  ];
  const studentLinks = [
    { to: '/student/submissions', label: 'Мої роботи', icon: FileText },
    { to: '/student/notifications', label: 'Сповіщення', icon: Bell, badge: unread },
  ];
  const links = user?.role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/30 flex flex-col p-4 gap-1">
        <div className="font-semibold text-sm mb-4 px-2">Перевірка робіт</div>
        {links.map(({ to, label, icon: Icon, badge }) => (
          <Link key={to} to={to}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${location.pathname.startsWith(to) ? 'bg-accent font-medium' : ''}`}>
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="inline-flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-4 h-4">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        ))}
        <div className="mt-auto">
          <div className="text-xs text-muted-foreground px-2 mb-2 truncate">{user?.name || user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />Вийти
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
