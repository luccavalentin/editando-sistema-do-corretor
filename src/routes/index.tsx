import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Tv, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  ArrowRight,
  Maximize2,
  Filter,
  PlusCircle,
  Package
} from 'lucide-react';
import { StatCard } from '@/features/os/components/StatCard';
import { OSKanbanCard } from '@/features/os/components/OSKanbanCard';
import { useOSDashboard } from '@/features/os/hooks/useOSDashboard';
import { STATUS_FLOW, STATUS_LABELS } from '@/features/os/types/status.constants';

export const Route = createFileRoute('/')({
  component: Dashboard,
});


function Dashboard() {
  const [viewMode, setViewMode] = useState<'operacional' | 'tv'>('operacional');
  const { stats, osList, updateStatus } = useOSDashboard();

  if (viewMode === 'tv') {
    return (
      <div className="fixed inset-0 bg-navy z-50 p-5 text-white overflow-hidden flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold font-heading tracking-tight">MONITORAMENTO DE PÁTIO</h1>
            <div className="h-12 w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-cyan font-bold text-xl uppercase tracking-widest">Tecnoar Freios</span>
              <span className="text-white/40 text-sm font-medium">Iracemápolis-SP</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-mono font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-white/40 font-medium uppercase tracking-widest text-xs">Atualização em tempo real</div>
            </div>
            <Button variant="ghost" onClick={() => setViewMode('operacional')} className="text-white/70 hover:text-white">
              <Maximize2 className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <TVStatCard label="No pátio agora" value={stats?.noPatio || 0} icon={<Truck />} color="text-white" />
          <TVStatCard label="Entraram hoje" value={stats?.entraramHoje || 0} icon={<ArrowRight />} color="text-cyan" />
          <TVStatCard label="Concluídas hoje" value={stats?.concluidasHoje || 0} icon={<CheckCircle2 />} color="text-green-400" />
          <TVStatCard label="OS em atraso" value={stats?.atrasadas || 0} icon={<AlertCircle />} color="text-orange" pulse />
        </div>

        <div className="flex-1 grid grid-cols-8 gap-4 overflow-hidden">
          {STATUS_FLOW.slice(0, 8).map(status => {
            const count = osList.filter((o: any) => o.status === status).length;
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="bg-white/5 rounded-md p-4 border border-white/10 flex flex-col items-center justify-center gap-2 aspect-square">
                  <span className="text-3xl font-semibold">{count}</span>
                  <span className="text-[10px] uppercase font-bold text-center leading-tight opacity-80">{STATUS_LABELS[status]}</span>
                </div>
                <div className="flex-1 bg-white/5 rounded-md p-2 border border-white/10 overflow-hidden relative">
                  {/* Feed simplificado */}
                  <div className="absolute inset-0 p-3 space-y-2 opacity-30 text-[10px] font-mono">
                    {(osList as any[]).filter((o: any) => o.status === status).map((o: any) => (
                      <div key={o.id} className="border-b border-white/10 pb-1">{o.protocolo}</div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="flex justify-between items-center border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold font-heading text-primary flex items-center gap-3 uppercase tracking-tight">
            <LayoutDashboard className="w-6 h-6 text-orange" />
            Central de Operações
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-widest opacity-80">Monitoramento Dinâmico de Pátio • Fluxo em Tempo Real</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-md border-border hover:bg-muted/50 transition-all font-medium text-xs uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 mr-2" />
            Filtrar Visão
          </Button>
          <Button 
            onClick={() => setViewMode('tv')} 
            size="sm"
            className="h-9 px-5 bg-primary hover:bg-primary/90 rounded-md gap-2.5 shadow-sm transition-all text-xs font-semibold uppercase tracking-wider"
          >
            <Tv className="w-3.5 h-3.5 text-cyan" />
            Exibição TV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="No pátio agora" value={stats?.noPatio || 0} icon={Truck} color="text-cyan-600" />
        <StatCard title="Entraram hoje" value={stats?.entraramHoje || 0} icon={PlusCircle} color="text-orange-500" />
        <StatCard title="Concluídas hoje" value={stats?.concluidasHoje || 0} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Tempo Médio" value="4.2h" icon={Clock} color="text-blue-500" />
        <StatCard title="Em Atraso" value={stats?.atrasadas || 0} icon={AlertCircle} color="text-red-500" />
        <StatCard title="Peças Vencendo" value={stats?.pecasVencendo || 0} icon={Package} color="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {STATUS_FLOW.map(status => {
          const items = osList.filter((o: any) => o.status === status);
          return (
            <div key={status} className="flex flex-col gap-2 bg-muted/20 p-2 rounded-sm border border-border/50">
              <div className="flex justify-between items-center px-1 mb-1">
                <h3 className="font-bold text-navy text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${items.length > 0 ? 'bg-orange shadow-[0_0_5px_rgba(240,96,0,0.5)]' : 'bg-muted-foreground/30'}`} />
                  {STATUS_LABELS[status]}
                </h3>
                <span className="bg-navy/5 text-navy px-1.5 py-0.5 rounded-xs text-[9px] font-bold tabular-nums border border-navy/10">{items.length}</span>
              </div>
              
              <div className="space-y-2 flex-1">
                {(items as any[]).map((os: any) => (
                  <OSKanbanCard 
                    key={os.id} 
                    os={os} 
                    onNextStatus={(os_id, novo_status) => updateStatus({ os_id, novo_status })}
                    nextStatus={STATUS_FLOW[STATUS_FLOW.indexOf(status as any) + 1]}
                  />
                ))}
                {items.length === 0 && (
                  <div className="h-12 border border-dashed border-border/40 rounded-sm flex items-center justify-center">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/30 tracking-widest italic">Vazio</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TVStatCard({ label, value, icon, color, pulse }: any) {
  return (
    <div className={`bg-white/5 rounded-lg p-4 border border-white/10 flex flex-col gap-2 ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="p-2 bg-white/5 rounded-md text-white/40">
          {icon}
        </div>
        <span className={`text-2xl font-semibold ${color}`}>{value}</span>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

