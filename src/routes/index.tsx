import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
    <div className="p-6 space-y-8 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-navy flex items-center justify-center shadow shadow-navy/10">
              <LayoutDashboard className="w-4 h-4 text-cyan" />
            </div>
            <h1 className="text-xl font-semibold text-primary uppercase tracking-tight">
              Central de Operações
            </h1>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] opacity-60">
            Monitoramento em Tempo Real • Pátio Industrial Tecnoar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-8 px-3 rounded border-border hover:bg-muted font-medium text-[10px] uppercase tracking-wider transition-all">
            <Filter className="w-3 h-3 mr-1.5" />
            Filtrar
          </Button>
          <Button 
            onClick={() => setViewMode('tv')} 
            className="h-8 px-4 bg-navy hover:bg-navy/90 text-white rounded shadow-sm gap-2 transition-all text-[10px] font-medium uppercase tracking-wider"
          >
            <Tv className="w-3 h-3 text-cyan" />
            Monitor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="No pátio agora" value={stats?.noPatio || 0} icon={Truck} color="text-cyan" />
        <StatCard title="Entraram hoje" value={stats?.entraramHoje || 0} icon={PlusCircle} color="text-orange" />
        <StatCard title="Concluídas hoje" value={stats?.concluidasHoje || 0} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard title="Tempo Médio" value="4.2h" icon={Clock} color="text-navy" />
        <StatCard title="Em Atraso" value={stats?.atrasadas || 0} icon={AlertCircle} color="text-destructive" />
        <StatCard title="Peças Vencendo" value={stats?.pecasVencendo || 0} icon={Package} color="text-orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-x-auto pb-6">
        {STATUS_FLOW.map(status => {
          const items = osList.filter((o: any) => o.status === status);
          return (
            <div key={status} className="flex flex-col gap-4 min-w-[260px]">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${items.length > 0 ? 'bg-orange shadow-[0_0_4px_rgba(240,96,0,0.4)]' : 'bg-muted-foreground/20'}`} />
                  <h3 className="font-semibold text-primary text-[10px] uppercase tracking-wider">
                    {STATUS_LABELS[status]}
                  </h3>
                </div>
                <span className="bg-navy/5 text-navy px-1.5 py-0.5 rounded text-[9px] font-medium tabular-nums border border-navy/10">
                  {items.length}
                </span>
              </div>
              
              <div className="space-y-3 flex-1">
                {(items as any[]).map((os: any) => (
                  <OSKanbanCard 
                    key={os.id} 
                    os={os} 
                    onNextStatus={(os_id, novo_status) => updateStatus({ os_id, novo_status })}
                    nextStatus={STATUS_FLOW[STATUS_FLOW.indexOf(status as any) + 1]}
                  />
                ))}
                {items.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-border/40 rounded-xl flex flex-col items-center justify-center bg-muted/5 gap-2 group transition-all hover:bg-muted/10">
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                      <PlusCircle className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/30 tracking-[0.2em]">Sem Fila</span>
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
  const [prevValue, setPrevValue] = useState(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      setPrevValue(value);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [value, prevValue]);

  return (
    <div className={cn(
      "bg-white/5 rounded-lg p-4 border border-white/10 flex flex-col gap-2 transition-all duration-500",
      pulse ? 'animate-pulse' : '',
      flash && "bg-white/10 border-cyan/30"
    )}>
      <div className="flex justify-between items-start">
        <div className="p-2 bg-white/5 rounded-md text-white/40">
          {icon}
        </div>
        <motion.span 
          key={value}
          initial={{ opacity: 0.5, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("text-2xl font-semibold tabular-nums", color)}
        >
          {value}
        </motion.span>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

