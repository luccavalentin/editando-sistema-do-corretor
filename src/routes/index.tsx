import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getOSStats, getOSList, updateOSStatus } from '@/integrations/management.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Tv, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  User, 
  ArrowRight,
  Maximize2,
  Filter
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

const STATUS_FLOW = [
  'aberta',
  'aguardando_mecanico',
  'checklist_diagnostico',
  'aguardando_peca',
  'em_execucao',
  'checklist_final',
  'aguardando_retirada',
  'enviado_financeiro',
  'concluida'
];

const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta',
  aguardando_mecanico: 'Aguard. Mecânico',
  checklist_diagnostico: 'Checklist Diag.',
  aguardando_peca: 'Aguard. Peça',
  em_execucao: 'Em Execução',
  checklist_final: 'Checklist Final',
  aguardando_retirada: 'Aguard. Retirada',
  enviado_financeiro: 'Financeiro',
  concluida: 'Concluída'
};

function Dashboard() {
  const [viewMode, setViewMode] = useState<'operacional' | 'tv'>('operacional');
  const queryClient = useQueryClient();
  const getStatsFn = useServerFn(getOSStats);
  const getListFn = useServerFn(getOSList);
  const updateStatusFn = useServerFn(updateOSStatus);

  const { data: stats } = useQuery({
    queryKey: ['os-stats'],
    queryFn: () => getStatsFn()
  });

  const { data: osList = [] } = useQuery({
    queryKey: ['os-list'],
    queryFn: () => getListFn()
  });

  const mutation = useMutation({
    mutationFn: (vars: { os_id: string, novo_status: string }) => 
      updateStatusFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-list'] });
      queryClient.invalidateQueries({ queryKey: ['os-stats'] });
      toast.success("Status atualizado");
    },
    onError: (error: any) => toast.error(error.message)
  });

  if (viewMode === 'tv') {
    return (
      <div className="fixed inset-0 bg-navy z-50 p-8 text-white overflow-hidden flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-4xl font-black font-heading tracking-tight">MONITORAMENTO DE PÁTIO</h1>
            <div className="h-12 w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-cyan font-bold text-xl uppercase tracking-widest">Tecnoar Freios</span>
              <span className="text-white/40 text-sm font-medium">Iracemápolis-SP</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-5xl font-mono font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-white/40 font-medium uppercase tracking-widest text-xs">Atualização em tempo real</div>
            </div>
            <Button variant="ghost" onClick={() => setViewMode('operacional')} className="text-white/40 hover:text-white">
              <Maximize2 className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
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
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center gap-2 aspect-square">
                  <span className="text-5xl font-black">{count}</span>
                  <span className="text-[10px] uppercase font-bold text-center leading-tight opacity-60">{STATUS_LABELS[status]}</span>
                </div>
                <div className="flex-1 bg-white/5 rounded-2xl p-2 border border-white/10 overflow-hidden relative">
                  {/* Feed simplificado */}
                  <div className="absolute inset-0 p-3 space-y-2 opacity-30 text-[10px] font-mono">
                    {osList.filter((o: any) => o.status === status).map((o: any) => (
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
    <div className="p-8 space-y-8 bg-navy/5 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-heading text-navy flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-orange" />
            Painel Operacional
          </h1>
          <p className="text-muted-foreground mt-1">Gestão de prontos-socorro da oficina</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-full gap-2 border-navy/10 hover:bg-navy/5">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          <Button 
            onClick={() => setViewMode('tv')} 
            className="bg-navy text-white hover:bg-navy/90 rounded-full gap-2 px-6 shadow-lg shadow-navy/20"
          >
            <Tv className="w-4 h-4 text-cyan" />
            Modo TV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {STATUS_FLOW.map(status => {
          const items = osList.filter((o: any) => o.status === status);
          return (
            <div key={status} className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-navy text-sm uppercase tracking-wider flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${items.length > 0 ? 'bg-orange animate-pulse' : 'bg-navy/20'}`} />
                  {STATUS_LABELS[status]}
                </h3>
                <span className="bg-navy/10 text-navy px-2 py-0.5 rounded-full text-[10px] font-bold">{items.length}</span>
              </div>
              
              <div className="space-y-3 min-h-[200px]">
                {items.map((os: any) => (
                  <Card key={os.id} className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white group hover:ring-2 hover:ring-orange/20 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-navy/40">{os.protocolo}</span>
                        <Clock className="w-3 h-3 text-muted-foreground" />
                      </div>
                      
                      <div>
                        <p className="text-sm font-bold text-navy line-clamp-1">{os.cliente?.nome}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">{os.veiculo?.placa_cavalo} • {os.veiculo?.modelo_cavalo}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-navy/5">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-navy/5 border-2 border-white flex items-center justify-center">
                            <User className="w-3 h-3 text-navy/40" />
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="h-8 rounded-full text-[10px] font-bold uppercase text-orange hover:bg-orange/5 gap-1"
                          onClick={() => {
                            const nextIndex = STATUS_FLOW.indexOf(status) + 1;
                            if (nextIndex < STATUS_FLOW.length) {
                              mutation.mutate({ os_id: os.id, novo_status: STATUS_FLOW[nextIndex] });
                            }
                          }}
                        >
                          Assumir
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="h-20 border-2 border-dashed border-navy/5 rounded-2xl" />
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
    <div className={`bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col gap-2 ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="p-2 bg-white/5 rounded-xl text-white/40">
          {icon}
        </div>
        <span className={`text-4xl font-black ${color}`}>{value}</span>
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

