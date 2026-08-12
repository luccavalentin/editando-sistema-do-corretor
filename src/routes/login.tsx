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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#001830] p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange via-orange/50 to-orange" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        <div className="bg-[#001d3d] rounded-sm p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-sm flex items-center justify-center mb-8 shadow-[0_10px_30px_rgba(255,255,255,0.1)] group transition-transform hover:scale-105">
               <div className="text-[#001830] font-black text-center leading-none">
                 <span className="block text-[10px] tracking-[0.4em] font-black text-[#001830]/40 mb-1.5 uppercase">SISTEMA</span>
                 <span className="block text-3xl tracking-tighter">TF</span>
               </div>
            </div>
            
            <div className="text-center space-y-3">
              <h1 className="text-base font-black font-heading text-white uppercase tracking-[0.4em]">PÁTIO INTELIGENTE</h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-[1px] w-8 bg-orange/50" />
                <p className="text-orange font-black text-[11px] uppercase tracking-[0.25em]">Tecnoar Freios</p>
                <div className="h-[1px] w-8 bg-orange/50" />
              </div>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] block ml-1">Usuário / E-mail</label>
              </div>
              <Input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 border-white/10 bg-white/5 text-white text-base focus:ring-2 focus:ring-orange/50 focus:border-orange outline-none transition-all placeholder:text-white/10 px-5 rounded-none"
                placeholder="nome.sobrenome@tecnoar.com"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] block">Senha de Acesso</label>
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  className="text-[10px] font-black text-orange/60 hover:text-orange uppercase tracking-wider transition-colors"
                >
                  Recuperar Senha
                </button>
              </div>
              <Input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 border-white/10 bg-white/5 text-white text-base focus:ring-2 focus:ring-orange/50 focus:border-orange outline-none transition-all placeholder:text-white/10 px-5 rounded-none"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange hover:bg-orange/90 text-white font-black h-16 rounded-none transition-all shadow-[0_10px_20px_rgba(240,96,0,0.2)] mt-6 text-sm uppercase tracking-[0.3em] active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : null}
              AUTENTICAR NO SISTEMA
            </Button>
          </form>
        </div>

        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 opacity-30">
            <div className="h-[1px] w-12 bg-white" />
            <div className="w-2 h-2 bg-orange rotate-45" />
            <div className="h-[1px] w-12 bg-white" />
          </div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] text-center leading-relaxed">
            PÁTIO INTELIGENTE TECNOAR v2.0<br/>
            UNIDADE IRACEMÁPOLIS-SP • 2026
          </p>
        </div>
      </div>
    </div>
  );
}