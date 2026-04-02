import { useLocation } from 'react-router-dom';
import { Signal } from 'lucide-react';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Signal className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
          <h2 className="text-xl font-semibold">Página não encontrada</h2>
          <p className="text-sm text-muted-foreground">
            A página <span className="font-medium text-foreground">"{pageName}"</span> não existe.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}