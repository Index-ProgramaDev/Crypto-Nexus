import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login, register, authError, clearAuthError } = useAuth();
  const { toast } = useToast();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearAuthError();
    setIsLoading(true);

    try {
      let result;
      if (isRegistering) {
        result = await register({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName
        });
      } else {
        result = await login(formData.email, formData.password);
      }

      if (result.success) {
        toast({
          title: isRegistering ? 'Conta criada!' : 'Bem-vindo!',
          description: isRegistering ? 'Sua conta foi criada com sucesso.' : 'Login realizado com sucesso.'
        });
        navigate('/');
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Ocorreu um erro. Tente novamente.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md p-8 border-border shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
            CryptoHub
          </h1>
          <p className="text-muted-foreground mt-2">
            {isRegistering ? 'Crie sua conta para começar' : 'Entre na sua conta'}
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {authError.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-9"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isRegistering ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              clearAuthError();
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isRegistering 
              ? 'Já tem uma conta? Entre aqui' 
              : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            Ao continuar, você concorda com os termos de uso e política de privacidade.
          </p>
        </div>
      </Card>
    </div>
  );
}
