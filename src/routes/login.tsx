import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy p-4">
      <div className="w-full max-w-md bg-white rounded-lg p-5 shadow-sm">
        <div className="flex flex-col items-center mb-5">
          <div className="w-32 h-32 bg-navy/5 rounded-full flex items-center justify-center mb-4">
             {/* Logo Placeholder - Escudo Tecnoar */}
             <div className="text-navy font-bold text-center">
               <span className="block text-xs">BRASÃO</span>
               <span className="block">TECNOAR</span>
             </div>
          </div>
          <h1 className="text-2xl font-bold font-heading text-navy">Pátio Inteligente</h1>
          <p className="text-muted-foreground text-sm">Acesse sua conta para continuar</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Usuário</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-md border border-border focus:ring-2 focus:ring-orange outline-none transition-all"
              placeholder="seu.nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Senha</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-md border border-border focus:ring-2 focus:ring-orange outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button className="w-full bg-orange hover:bg-orange/90 text-white font-bold py-3 rounded-sm transition-all shadow-sm shadow-orange/20 mt-4">
            Entrar no Sistema
          </button>
        </form>
      </div>
      <p className="mt-8 text-white/40 text-xs">© 2026 Tecnoar Freios - Iracemápolis-SP</p>
    </div>
  );
}
