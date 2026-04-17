import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Send, Loader2, Bell } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SendAlert() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [targetLevel, setTargetLevel] = useState('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!title || !message) return;
    setIsSending(true);
    try {
      await api.createAlert({
        title,
        message,
        type,
        targetLevel: targetLevel === 'all' ? 'public' : targetLevel,
        targetEmail: targetEmail || undefined,
      });
      toast({ title: 'Alerta enviado!' });
      setTitle('');
      setMessage('');
      setTargetEmail('');
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-4 border-border space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Enviar Alerta</h3>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do alerta" />
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem..." className="h-20" />
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="signal">Sinal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={targetLevel} onValueChange={setTargetLevel}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="mentored">Mentorados</SelectItem>
            <SelectItem value="advanced">Avançados</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="Email específico (opcional)" />
      <Button onClick={handleSend} disabled={!title || !message || isSending} className="w-full">
        {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
        Enviar Alerta
      </Button>
    </Card>
  );
}