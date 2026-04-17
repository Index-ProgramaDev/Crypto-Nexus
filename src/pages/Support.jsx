import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Phone, Mail, Send, Loader2, HelpCircle, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Support() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setIsSending(true);
    // Simulação de envio - backend não tem endpoint de email
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({ title: 'Mensagem enviada!', description: 'Entraremos em contato em breve.' });
    setName('');
    setEmail('');
    setMessage('');
    setIsSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Suporte</h1>
          <p className="text-sm text-muted-foreground">Estamos aqui para ajudar</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Telefone</p>
              <p className="text-sm text-muted-foreground">(11) 99999-9999</p>
            </div>
          </div>
          <a href="tel:+5511999999999">
            <Button variant="outline" className="w-full" size="sm">
              <Phone className="w-4 h-4 mr-2" /> Ligar agora
            </Button>
          </a>
        </Card>

        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-neon-blue" />
            </div>
            <div>
              <p className="font-semibold text-sm">Email</p>
              <p className="text-sm text-muted-foreground">suporte@cryptohub.com</p>
            </div>
          </div>
          <a href="mailto:suporte@cryptohub.com">
            <Button variant="outline" className="w-full" size="sm">
              <Mail className="w-4 h-4 mr-2" /> Enviar email
            </Button>
          </a>
        </Card>
      </div>

      <Card className="p-5 border-border">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Enviar Mensagem</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu email" type="email" required />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Sua mensagem..." className="h-28" required />
          <Button type="submit" disabled={isSending} className="w-full">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
            Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
}