import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy p-6">
      <div className="w-full max-w-sm bg-card rounded-sm p-8 shadow-2xl border border-white/5">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-sm flex items-center justify-center mb-6 shadow-lg">
             <div className="text-navy font-black text-center leading-none">
               <span className="block text-[8px] tracking-[0.3em] font-bold opacity-40 mb-1 uppercase">SISTEMA</span>
               <span className="block text-2xl tracking-tighter">TF</span>
             </div>
          </div>
          <h1 className="text-sm font-bold font-heading text-white/90 uppercase tracking-[0.3em]">PÁTIO INTELIGENTE</h1>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-2">Tecnoar Freios v2.0</p>
        </div>

        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Credencial de Acesso</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-sm border border-white/10 bg-white/5 text-white text-sm focus:ring-1 focus:ring-orange outline-none transition-all placeholder:text-white/10"
              placeholder="usuário.matrícula"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Chave de Segurança</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-sm border border-white/10 bg-white/5 text-white text-sm focus:ring-1 focus:ring-orange outline-none transition-all placeholder:text-white/10"
              placeholder="••••••••"
            />
          </div>
          <button className="w-full bg-orange hover:bg-orange/90 text-white font-bold py-4 rounded-sm transition-all shadow-lg shadow-orange/10 mt-4 text-xs uppercase tracking-[0.2em]">
            INICIAR SESSÃO
          </button>
        </form>
      </div>
      <p className="mt-10 text-white/20 text-[9px] font-bold uppercase tracking-[0.3em]">© 2026 TECNOAR FREIOS • IRACEMÁPOLIS-SP</p>
    </div>
  );
}
