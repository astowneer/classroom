import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, Spinner } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    const [nRes, mRes] = await Promise.all([
      api.get('/notifications'),
      api.get('/messages/unread'),
    ]);
    setNotifications(nRes.data);
    setUnreadMessages(mRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const goToChat = (submissionId) => {
    const path = user?.role === 'teacher'
      ? `/teacher/reports/${submissionId}`
      : `/student/submissions/${submissionId}`;
    navigate(path);
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  const totalUnread = unreadMessages.reduce((s, r) => s + parseInt(r.count), 0);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Сповіщення</h1>

      {/* Unread messages summary */}
      {unreadMessages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Непрочитані повідомлення ({totalUnread})
          </h2>
          <div className="flex flex-col gap-2">
            {unreadMessages.map(r => (
              <Card key={r.submissionId} className="border-primary/30 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => goToChat(r.submissionId)}>
                <CardContent className="pt-3 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm">Робота #{r.submissionId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5">
                      {r.count}
                    </span>
                    <span className="text-xs text-muted-foreground">нових</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        Сповіщення
      </h2>
      {notifications.length === 0 ? (
        <p className="text-muted-foreground text-sm">Сповіщень немає.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(n => (
            <Card key={n.id} className={n.read ? 'opacity-60' : 'border-primary/30'}>
              <CardContent className="pt-4 pb-3 flex items-start gap-3">
                <Bell className={`h-4 w-4 mt-0.5 flex-shrink-0 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString('uk-UA')}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {n.submissionId && (
                    <Button size="sm" variant="outline" onClick={() => goToChat(n.submissionId)}>
                      <MessageSquare className="h-3 w-3 mr-1" />Чат
                    </Button>
                  )}
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>✓</Button>
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
