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
    queryFn: () => getPecasTeste({ data: {} })
  });

  const { data: agenda } = useSuspenseQuery({
    queryKey: ['agenda-servicos'],
    queryFn: () => getAgendaServicos({ data: {} })
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-space text-[#001830]">Produção & Histórico</h1>
          <p className="text-muted-foreground">Gestão de peças em teste e agenda de serviços.</p>
        </div>
      </div>

      <Tabs defaultValue="pecas" className="w-full">
        <TabsList className="bg-background border">
          <TabsTrigger value="pecas" className="gap-2">
            <Package className="w-4 h-4" /> Peças em Teste
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2">
            <Calendar className="w-4 h-4" /> Agenda de Serviços
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pecas" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pecas.map((peca: any) => {
              const horasRestantes = differenceInHours(new Date(peca.vencimento_em), new Date());
              const isUrgent = horasRestantes < 12;

              return (
                <Card key={peca.id} className="p-4 flex flex-col justify-between border-l-4 border-l-orange-500">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {peca.status.replace('_', ' ')}
                      </Badge>
                      {isUrgent && peca.status === 'em_teste' && (
                        <Badge variant="destructive" className="animate-pulse">URGENTE</Badge>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-[#001830]">{peca.descricao_peca}</h3>
                      <p className="text-xs text-muted-foreground">{peca.cliente?.nome}</p>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        Vence: {format(new Date(peca.vencimento_em), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      {peca.os && (
                        <div className="font-medium text-cyan-600">OS: {peca.os.protocolo}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    {peca.status === 'recebida' && (
                      <Button size="sm" className="w-full bg-[#001830]" onClick={() => statusMutation.mutate({ id: peca.id, status: 'em_teste' })}>
                        Iniciar Teste
                      </Button>
                    )}
                    {peca.status === 'em_teste' && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 text-green-600" onClick={() => statusMutation.mutate({ id: peca.id, status: 'testada_aprovada', removeEtiqueta: true })}>
                          Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => statusMutation.mutate({ id: peca.id, status: 'testada_reprovada', removeEtiqueta: true })}>
                          Reprovar
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['eletrica', 'socorro', 'troca_cuicas_aparelho_diag', 'teste_valvulas', 'troca_valvulas', 'vazamentos_ar'].map((esp) => (
              <div key={esp} className="space-y-3">
                <h3 className="font-bold font-space text-lg border-b pb-2 flex items-center justify-between">
                  <span className="capitalize">{esp.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{agenda.filter((a: any) => a.especialidade === esp).length}</Badge>
                </h3>
                <div className="space-y-2">
                  {agenda.filter((a: any) => a.especialidade === esp).map((item: any) => (
                    <Card key={item.id} className="p-3 bg-white/50 border-dashed">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-sm text-[#001830]">{item.os.protocolo}</div>
                        <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.os.clientes.nome} • {item.os.veiculos.placa_cavalo}
                      </div>
                      <div className="mt-2 text-[10px] font-medium text-cyan-600">
                        {format(new Date(item.data_prevista), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </Card>
                  ))}
                  {agenda.filter((a: any) => a.especialidade === esp).length === 0 && (
                    <div className="text-xs text-muted-foreground py-4 text-center italic">Nenhum serviço agendado</div>
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