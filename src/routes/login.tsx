import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("E-mail ou senha incorretos");
        return;
      }

      // Explicitly refresh session to ensure RequireRole gets the new state
      await supabase.auth.refreshSession();
      
      toast.success("Acesso autorizado");
      navigate({ to: '/' });
    } catch (err) {
      toast.error("Erro inesperado ao realizar login");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Informe seu e-mail para recuperar a senha");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("Instruções enviadas para seu e-mail");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm bg-card rounded-sm p-8 shadow-2xl border border-white/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-sm flex items-center justify-center mb-6 shadow-lg">
             <div className="text-navy font-black text-center leading-none">
               <span className="block text-[8px] tracking-[0.3em] font-bold text-navy/60 mb-1 uppercase">SISTEMA</span>
               <span className="block text-2xl tracking-tighter">TF</span>
             </div>
          </div>
          <h1 className="text-sm font-bold font-heading text-white uppercase tracking-[0.3em]">PÁTIO INTELIGENTE</h1>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Tecnoar Freios v2.0</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">E-mail</label>
            <Input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 border-white/20 bg-white/5 text-white text-sm focus:ring-1 focus:ring-orange outline-none transition-all placeholder:text-white/20"
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">Senha</label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="text-[9px] font-bold text-orange/80 hover:text-orange uppercase tracking-wider transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
            <Input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 border-white/20 bg-white/5 text-white text-sm focus:ring-1 focus:ring-orange outline-none transition-all placeholder:text-white/20"
              placeholder="••••••••"
            />
          </div>
          <Button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange hover:bg-orange/90 text-white font-bold h-14 rounded-sm transition-all shadow-lg shadow-orange/20 mt-4 text-xs uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            INICIAR SESSÃO
          </Button>
        </form>
      </div>
      <p className="mt-10 text-white/40 text-[9px] font-bold uppercase tracking-[0.3em]">© 2026 TECNOAR FREIOS • IRACEMÁPOLIS-SP</p>
    </div>
  );
}