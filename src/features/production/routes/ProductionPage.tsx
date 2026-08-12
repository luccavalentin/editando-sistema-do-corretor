import React from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPecasTeste, updatePecaStatus, getAgendaServicos } from '../lib/production.functions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';

export function ProductionPage() {
  const queryClient = useQueryClient();
  
  const { data: pecas } = useSuspenseQuery({
    queryKey: ['pecas-teste'],
    queryFn: () => getPecasTeste()
  });

  const { data: agenda } = useSuspenseQuery({
    queryKey: ['agenda-servicos'],
    queryFn: () => getAgendaServicos()
  });

  const updateStatusFn = useServerFn(updatePecaStatus);
  const statusMutation = useMutation({
    mutationFn: (data: any) => updateStatusFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pecas-teste'] });
      toast.success("Status atualizado com sucesso!");
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold font-heading text-primary uppercase tracking-tight">Produção e Agenda</h1>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-widest opacity-80">Gestão técnica e fluxo de testes</p>
        </div>
      </div>

      <Tabs defaultValue="pecas" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-sm h-10">
          <TabsTrigger value="pecas" className="gap-2 text-[11px] font-bold uppercase tracking-wider rounded-xs px-4">
            <Package className="w-3.5 h-3.5" /> PEÇAS EM TESTE
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2 text-[11px] font-bold uppercase tracking-wider rounded-xs px-4">
            <Calendar className="w-3.5 h-3.5" /> AGENDA TÉCNICA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pecas" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pecas.map((peca: any) => {
              const horasRestantes = differenceInHours(new Date(peca.vencimento_em), new Date());
              const isUrgent = horasRestantes < 12;

              return (
                <Card key={peca.id} className="elevation-1 bg-card p-5 flex flex-col justify-between border-l-4 border-l-primary/40 group hover:elevation-2 transition-all">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-semibold uppercase border border-border tracking-wider">
                        {peca.status.replace('_', ' ')}
                      </span>
                      {isUrgent && peca.status === 'em_teste' && (
                        <span className="bg-orange/10 text-orange border border-orange/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase animate-pulse">Urgente</span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-semibold text-primary text-sm leading-tight group-hover:text-orange transition-colors">{peca.descricao_peca}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{peca.cliente?.nome}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                        <Clock className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                        Vence: {format(new Date(peca.vencimento_em), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      {peca.os && (
                        <div className="text-[11px] font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 opacity-70" />
                          OS: {peca.os.protocolo}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    {peca.status === 'recebida' && (
                      <Button size="sm" className="w-full bg-navy text-white hover:bg-navy/90 rounded-sm text-[10px] font-bold uppercase tracking-widest h-8" onClick={() => statusMutation.mutate({ id: peca.id, status: 'em_teste' })}>
                        INICIAR TESTE
                      </Button>
                    )}
                    {peca.status === 'em_teste' && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 text-green-700 border-green-200 hover:bg-green-50 rounded-sm text-[10px] font-bold uppercase tracking-widest h-8" onClick={() => statusMutation.mutate({ id: peca.id, status: 'testada_aprovada', removeEtiqueta: true })}>
                          APROVAR
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-700 border-red-200 hover:bg-red-50 rounded-sm text-[10px] font-bold uppercase tracking-widest h-8" onClick={() => statusMutation.mutate({ id: peca.id, status: 'testada_reprovada', removeEtiqueta: true })}>
                          REPROVAR
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['eletrica', 'socorro', 'troca_cuicas_aparelho_diag', 'teste_valvulas', 'troca_valvulas', 'vazamentos_ar'].map((esp) => (
              <div key={esp} className="space-y-3">
                <div className="px-1 border-b border-border pb-2">
                  <h3 className="font-bold text-navy text-[10px] uppercase tracking-widest flex items-center justify-between">
                    {esp.replace(/_/g, ' ')}
                    <span className="bg-muted px-1.5 py-0.5 rounded-xs text-[9px] font-bold text-muted-foreground tabular-nums">
                      {agenda.filter((a: any) => a.especialidade === esp).length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {agenda.filter((a: any) => a.especialidade === esp).map((item: any) => (
                    <div key={item.id} className="p-4 bg-card elevation-1 rounded-md interactive-item space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="font-mono text-[11px] font-semibold text-primary">{item.os.protocolo}</div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{item.status}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-semibold text-primary uppercase tracking-tight line-clamp-1">{item.os.clientes.nome}</div>
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{item.os.veiculos.placa_cavalo}</div>
                      </div>
                      <div className="pt-2 border-t border-border text-[10px] font-semibold text-primary uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 opacity-60" />
                        {format(new Date(item.data_prevista), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                  {agenda.filter((a: any) => a.especialidade === esp).length === 0 && (
                    <div className="text-[10px] uppercase font-medium text-muted-foreground/30 py-8 text-center italic border border-dashed border-border rounded-md bg-muted/5">
                      Sem Agendamentos
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}