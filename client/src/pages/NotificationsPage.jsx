import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, Spinner } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/notifications').then(r => setNotifications(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Сповіщення</h1>
      {notifications.length === 0 ? (
        <p className="text-muted-foreground">Сповіщень немає.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map(n => (
            <Card key={n.id} className={n.read ? 'opacity-60' : 'border-primary/30'}>
              <CardContent className="pt-4 flex items-start gap-3">
                <Bell className={`h-4 w-4 mt-0.5 flex-shrink-0 ${n.read ? 'text-muted-foreground' : 'text-primary'}`} />
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString('uk-UA')}
                  </p>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Прочитано</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
