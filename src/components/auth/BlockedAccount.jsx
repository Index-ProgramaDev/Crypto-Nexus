import React from 'react';
import { Ban, AlertTriangle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BlockedAccount({ blockedInfo, onClose }) {
  const formatBlockedUntil = (dateString) => {
    if (!dateString) return 'Tempo indeterminado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPermanent = !blockedInfo?.blockedUntil;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 border-destructive/20">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="w-full">
            <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg mb-2">
              <h2 className="text-lg font-bold uppercase tracking-wide">SUA CONTA FOI BLOQUEADA</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Seu acesso ao CryptoNexus foi suspenso
            </p>
          </div>

          <div className="w-full bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Motivo:</span>
              <span>{blockedInfo?.reason || 'Violação dos termos de uso'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{isPermanent ? 'Duração:' : 'Bloqueado até:'}</span>
              <span>{isPermanent ? 'Permanente' : formatBlockedUntil(blockedInfo?.blockedUntil)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>

          <Button onClick={onClose} variant="outline" className="w-full">
            Entendi
          </Button>
        </div>
      </Card>
    </div>
  );
}
