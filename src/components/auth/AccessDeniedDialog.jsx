import React from 'react';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const areaConfig = {
  vip: {
    title: 'Área VIP',
    description: 'Acesso exclusivo a sinais de trading e análises avançadas',
    icon: Crown,
    planName: 'Plano VIP',
    price: 'R$ 97/mês'
  },
  mentored: {
    title: 'Área Mentorada',
    description: 'Conteúdo exclusivo para alunos do programa de mentoria',
    icon: Lock,
    planName: 'Programa de Mentoria',
    price: 'R$ 297/mês'
  },
  advanced: {
    title: 'Área Avançada',
    description: 'Estratégias avançadas e conteúdo técnico profissional',
    icon: Lock,
    planName: 'Plano Avançado',
    price: 'R$ 147/mês'
  }
};

export default function AccessDeniedDialog({ area = 'vip', onClose }) {
  const navigate = useNavigate();
  const config = areaConfig[area] || areaConfig.vip;
  const Icon = config.icon;

  const handlePayment = () => {
    // TODO: Implementar integração com gateway de pagamento
    alert(`Redirecionando para pagamento do ${config.planName} - ${config.price}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 border-neon-purple/30">
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Ícone bloqueado */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-purple/20 to-destructive/20 flex items-center justify-center border-2 border-neon-purple/30">
            <Icon className="w-10 h-10 text-neon-purple" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Área bloqueada destacada */}
          <div className="w-full bg-destructive text-destructive-foreground px-4 py-3 rounded-lg">
            <h2 className="text-lg font-bold uppercase tracking-wide">ÁREA BLOQUEADA</h2>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{config.title}</h3>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </div>

          {/* Card do plano */}
          <div className="w-full bg-gradient-to-r from-neon-purple/10 to-transparent border border-neon-purple/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-neon-purple">{config.planName}</p>
                <p className="text-2xl font-bold">{config.price}</p>
              </div>
              <Crown className="w-8 h-8 text-neon-purple/50" />
            </div>
          </div>

          {/* Aviso */}
          <p className="text-xs text-muted-foreground px-4">
            Você não possui acesso a esta área. Assine um plano para desbloquear todo o conteúdo.
          </p>

          {/* Botões */}
          <div className="w-full space-y-2">
            <Button 
              onClick={handlePayment}
              className="w-full bg-gradient-to-r from-neon-purple to-purple-600 hover:from-neon-purple/90 hover:to-purple-600/90 text-white font-semibold"
            >
              <Crown className="w-4 h-4 mr-2" />
              Quero Assinar Agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              onClick={onClose}
              variant="outline" 
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
