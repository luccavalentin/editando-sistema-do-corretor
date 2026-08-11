import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Provisório: redireciona para login se não quiser mostrar placeholder vazio
    // throw redirect({ to: '/login' });
  },
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold font-heading text-navy">Dashboard</h1>
      <p className="mt-4 text-muted-foreground">Bem-vindo ao Pátio Inteligente Tecnoar.</p>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass border-navy/10">
          <h3 className="font-heading font-bold">OS em Aberto</h3>
          <p className="text-4xl mt-2 font-bold text-orange">0</p>
          <p className="text-sm text-muted-foreground mt-2">Nenhuma ordem de serviço ativa.</p>
        </div>
        <div className="p-6 rounded-2xl glass border-navy/10">
          <h3 className="font-heading font-bold">Veículos no Pátio</h3>
          <p className="text-4xl mt-2 font-bold text-navy">0</p>
          <p className="text-sm text-muted-foreground mt-2">Pátio vazio.</p>
        </div>
        <div className="p-6 rounded-2xl glass border-navy/10">
          <h3 className="font-heading font-bold">Checklists Hoje</h3>
          <p className="text-4xl mt-2 font-bold text-cyan">0</p>
          <p className="text-sm text-muted-foreground mt-2">Nenhum checklist realizado.</p>
        </div>
      </div>
    </div>
  );
}
