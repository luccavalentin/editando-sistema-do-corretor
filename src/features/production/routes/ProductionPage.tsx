import React, { useState } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPecasTeste, updatePecaStatus, getAgendaServicos, searchProdutos } from '../lib/production.functions';
import { getProdutoSaldoOmie } from '@/features/omie/services/estoque.functions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Calendar, Clock, CheckCircle2, Database, Search, RefreshCw, BarChart, Loader2 } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useServerFn } from '@tanstack/react-start';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

const Route = createFileRoute('/production')({});

export function ProductionPage() {
  const { tab } = Route.useSearch() as any;
  const [activeTab, setActiveTab] = useState(tab || 'pecas');
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchProdFn = useServerFn(searchProdutos);
  const getSaldoFn = useServerFn(getProdutoSaldoOmie);
  
  const [saldosCarregando, setSaldosCarregando] = useState<Record<number, boolean>>({});

  const handleUpdateSaldo = async (codigo: number) => {
    setSaldosCarregando(prev => ({ ...prev, [codigo]: true }));
    try {
      const novoSaldo = await getSaldoFn({ data: { codigo_produto: codigo } });
      setSearchResults(prev => prev.map(p => 
        p.omie_codigo_produto === codigo ? { ...p, saldo: novoSaldo } : p
      ));
      toast.success("Saldo atualizado");
    } catch (err) {
      toast.error("Erro ao atualizar saldo");
    } finally {
      setSaldosCarregando(prev => ({ ...prev, [codigo]: false }));
    }
  };
  
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

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;
    setIsSearching(true);
    try {
      const results = await searchProdFn({ data: { query: searchQuery } });
      setSearchResults(results || []);
    } catch (err) {
      toast.error("Erro na busca de produtos");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-primary uppercase tracking-tight">Produção e Agenda</h1>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] opacity-60">Gestão técnica e fluxo de testes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border rounded h-9">
          <TabsTrigger value="pecas" className="gap-2 text-[10px] font-semibold uppercase tracking-wider rounded px-4">
            <Package className="w-3 h-3" /> PEÇAS EM TESTE
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2 text-[10px] font-semibold uppercase tracking-wider rounded px-4">
            <Calendar className="w-3 h-3" /> AGENDA TÉCNICA
          </TabsTrigger>
          <TabsTrigger value="estoque" className="gap-2 text-[10px] font-semibold uppercase tracking-wider rounded px-4">
            <Database className="w-3 h-3" /> ESTOQUE (OMIE)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pecas" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pecas.map((peca: any) => {
              const horasRestantes = differenceInHours(new Date(peca.vencimento_em), new Date());
              const isUrgent = horasRestantes < 12;

              return (
                <Card key={peca.id} className="card-system p-3 flex flex-col justify-between border-l-2 border-l-primary/60 group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="bg-muted text-muted-foreground/80 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase border border-border tracking-wider">
                        {peca.status.replace('_', ' ')}
                      </span>
                      {isUrgent && peca.status === 'em_teste' && (
                        <span className="bg-orange/10 text-orange border border-orange/20 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase">Urgente</span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-semibold text-primary text-[13px] leading-tight group-hover:text-orange transition-colors">{peca.descricao_peca}</h3>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{peca.cliente?.nome}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-[9px] text-muted-foreground font-medium uppercase tracking-tight">
                        <Clock className="w-3 h-3 mr-1.5 opacity-50" />
                        Vence: {format(new Date(peca.vencimento_em), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      {peca.os && (
                        <div className="text-[9px] font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3 h-3 opacity-60" />
                          OS: {peca.os.protocolo}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                    {peca.status === 'recebida' && (
                      <Button size="sm" className="w-full bg-navy text-white hover:bg-navy/90 rounded text-[9px] font-semibold uppercase tracking-wider h-7" onClick={() => statusMutation.mutate({ id: peca.id, status: 'em_teste' })}>
                        INICIAR TESTE
                      </Button>
                    )}
                    {peca.status === 'em_teste' && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded text-[9px] font-semibold uppercase tracking-wider h-7" onClick={() => statusMutation.mutate({ id: peca.id, status: 'testada_aprovada', removeEtiqueta: true })}>
                          APROVAR
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-700 border-red-200 hover:bg-red-50 rounded text-[9px] font-semibold uppercase tracking-wider h-7" onClick={() => statusMutation.mutate({ id: peca.id, status: 'testada_reprovada', removeEtiqueta: true })}>
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
                    <span className="bg-muted px-1 py-0.5 rounded text-[9px] font-medium text-muted-foreground tabular-nums">
                      {agenda.filter((a: any) => a.especialidade === esp).length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {agenda.filter((a: any) => a.especialidade === esp).map((item: any) => (
                    <div key={item.id} className="card-system p-2 interactive-item space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="font-mono text-[10px] font-medium text-primary">{item.os.protocolo}</div>
                        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{item.status}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-semibold text-primary uppercase tracking-tight line-clamp-1">{item.os.clientes.nome}</div>
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{item.os.veiculos.placa_cavalo}</div>
                      </div>
                      <div className="pt-2 border-t border-border/50 text-[9px] font-medium text-primary uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-3 h-3 opacity-50" />
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

        <TabsContent value="estoque" className="pt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input 
                    placeholder="Buscar no estoque Omie (mín. 3 caracteres)..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 h-10 text-xs" 
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="h-10 bg-navy text-white text-[10px] font-bold uppercase tracking-wider px-6"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />} 
                  Buscar
                </Button>
              </div>

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Peça / Produto</th>
                      <th className="p-3">Código Omie</th>
                      <th className="p-3 text-right">Saldo</th>
                      <th className="p-3 text-right">Fonte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {searchResults.length > 0 ? (
                      searchResults.map((prod) => (
                        <tr key={prod.omie_codigo_produto || prod.id} className="hover:bg-muted/5 transition-colors">
                          <td className="p-3 font-semibold">{prod.descricao}</td>
                          <td className="p-3 font-mono text-cyan">{prod.omie_codigo_produto}</td>
                          <td className="p-3 text-right font-bold text-navy">
                            <div className="flex items-center justify-end gap-2">
                              {prod.saldo} UN
                              {prod.is_omie_temp && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={() => handleUpdateSaldo(prod.omie_codigo_produto)}
                                  disabled={saldosCarregando[prod.omie_codigo_produto]}
                                >
                                  <RefreshCw className={`w-3 h-3 ${saldosCarregando[prod.omie_codigo_produto] ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {prod.is_omie_temp ? (
                              <Badge variant="outline" className="text-[8px] border-cyan/30 text-cyan uppercase font-bold flex gap-1 items-center justify-end">
                                <Database className="w-2.5 h-2.5" /> OMIE
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] border-primary/20 text-primary uppercase font-bold">Local</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-muted/5">
                        <td className="p-3 font-semibold">CÚICA DE FREIO 24X30</td>
                        <td className="p-3 font-mono text-cyan">PRD00123</td>
                        <td className="p-3 text-right font-bold text-navy">42 UN</td>
                        <td className="p-3 text-right">
                           <Badge variant="outline" className="text-[8px] border-primary/20 text-primary uppercase font-bold">Demo</Badge>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="card-system p-4 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary pb-3 border-b border-border">
                  <BarChart className="w-4 h-4 text-orange" /> Resumo de Inventário
                </div>
                <div className="space-y-3 pt-1">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">Itens Cadastrados</p>
                    <p className="text-xl font-bold text-navy">2.450</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">Abaixo do Mínimo</p>
                    <p className="text-xl font-bold text-orange">18</p>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[8px] italic text-muted-foreground">Última sync: há 12 min</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}