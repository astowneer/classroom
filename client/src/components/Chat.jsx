import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Send } from 'lucide-react';

export default function Chat({ submissionId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  const load = () =>
    api.get(`/messages/${submissionId}`).then(r => setMessages(r.data));

  useEffect(() => { load(); }, [submissionId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await api.post(`/messages/${submissionId}`, { text });
    setMessages(prev => [...prev, res.data]);
    setText('');
    setSending(false);
  };

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden" style={{ height: 400 }}>
      <div className="px-4 py-2 border-b bg-muted/30 text-sm font-medium">Чат</div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">Повідомлень немає. Напишіть перше!</p>
        )}
        {messages.map(m => {
          const isMe = m.sender?.id === user?.id;
          return (
            <div key={m.id} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="text-xs text-muted-foreground mb-0.5">
                {isMe ? 'Ви' : (m.sender?.name || m.sender?.email)} · {new Date(m.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 p-3 border-t">
        <input
          className="flex-1 border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Напишіть повідомлення..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={sending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
