import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Spinner } from './ui/Card';
import { BookOpen, FileText, Bell, LogOut } from 'lucide-react';

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

  const teacherLinks = [
    { to: '/teacher/courses', label: 'Курси', icon: BookOpen },
    { to: '/teacher/notifications', label: 'Сповіщення', icon: Bell },
  ];
  const studentLinks = [
    { to: '/student/submissions', label: 'Мої роботи', icon: FileText },
    { to: '/student/notifications', label: 'Сповіщення', icon: Bell },
  ];
  const links = user?.role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/30 flex flex-col p-4 gap-1">
        <div className="font-semibold text-sm mb-4 px-2">Перевірка робіт</div>
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${location.pathname.startsWith(to) ? 'bg-accent font-medium' : ''}`}>
            <Icon className="h-4 w-4" />{label}
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
