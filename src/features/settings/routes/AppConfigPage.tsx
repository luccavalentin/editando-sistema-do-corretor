import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Clock, ShieldCheck, Database, MessageSquare, RefreshCw, AlertCircle, ExternalLink, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { syncClientesOmie, syncEstoqueOmie, checkOmieStatus } from '@/features/omie/services/omie.functions';
import { getSecretsStatus, saveSecret } from '../services/secrets.functions';
import { cn } from '@/lib/utils';

export default function AppConfigPage() {
  const queryClient = useQueryClient();
  const { data: configs, refetch } = useQuery({
    queryKey: ['app_configs'],
    queryFn: async () => {
      const { data } = await supabase.from('app_config').select('*');
      return data || [];
    }
  });

  const { data: syncLogs } = useQuery({
    queryKey: ['omie_sync_logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('omie_sync_log')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(20);
      return data || [];
    }
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: any }) => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuração atualizada');
      refetch();
    }
  });
  
  const getOmieStatus = useServerFn(checkOmieStatus);
  const { data: omieStatus } = useQuery({
    queryKey: ['omie_status'],
    queryFn: () => getOmieStatus()
  });

  const syncClientes = useServerFn(syncClientesOmie);
  const syncEstoque = useServerFn(syncEstoqueOmie);

  const mutationClientes = useMutation({
    mutationFn: () => syncClientes(),
    onSuccess: () => {
      toast.success('Sincronização de clientes iniciada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['omie_sync_logs'] });
    },
    onError: (error: any) => toast.error(`Erro ao sincronizar clientes: ${error.message}`)
  });

  const mutationEstoque = useMutation({
    mutationFn: () => syncEstoque(),
    onSuccess: () => {
      toast.success('Sincronização de estoque iniciada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['omie_sync_logs'] });
    },
    onError: (error: any) => toast.error(`Erro ao sincronizar estoque: ${error.message}`)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-navy uppercase tracking-tight">CONFIGURAÇÕES TÉCNICAS</h2>
      </div>

      <Tabs defaultValue="sla" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-sm h-10 mb-6">
          <TabsTrigger value="sla" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">SLA & PRAZOS</TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">WHATSAPP</TabsTrigger>
          <TabsTrigger value="omie" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">INTEGRAÇÃO OMIE</TabsTrigger>
        </TabsList>

        <TabsContent value="sla" className="space-y-4">
          <Card className="rounded-sm border border-border shadow-xs bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-navy">
                <Clock className="w-4 h-4 text-primary" />
                LIMITES OPERACIONAIS (HORAS)
              </CardTitle>
              <CardDescription className="text-[10px] uppercase font-semibold text-muted-foreground/60 tracking-wider">Defina os thresholds de tempo para alertas e SLA por fase.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prazo Peça em Teste (Horas)</Label>
                  <Input 
                    type="number" 
                    defaultValue={configs?.find(c => c.key === 'prazo_peca_teste')?.value || 48}
                    onBlur={(e) => updateConfig.mutate({ key: 'prazo_peca_teste', value: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="rounded-md border-none shadow-xs shadow-navy/5 bg-white border-l-4 border-l-orange">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange" />
                Integração WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-orange/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-bold text-navy">Canal WhatsApp não configurado</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Para habilitar o envio automático e o atendimento via IA, configure as chaves da Meta Cloud API nas variáveis de ambiente do servidor (WHATSAPP_API_KEY).
              </p>
              <Button variant="outline" className="rounded-md border-navy/20" disabled>
                Configurar API
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="omie" className="space-y-4">
          <Card className="rounded-sm border border-border shadow-xs bg-card">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-navy">
                    <Database className="w-4 h-4 text-primary" />
                    STATUS DA INTEGRAÇÃO
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-semibold text-muted-foreground/60 tracking-wider">
                    Conexão técnica com o ERP Omie
                  </CardDescription>
                </div>
                {omieStatus?.configured ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1.5 rounded px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    CONECTADO
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1.5 rounded px-2">
                    <AlertCircle className="w-3 h-3" />
                    NÃO CONFIGURADO
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {!omieStatus?.configured && (
                <div className="p-4 rounded border border-destructive/20 bg-destructive/5 text-destructive space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" />
                    Configuração Necessária
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed opacity-90">
                    As chaves de API não foram detectadas. Configure <code className="bg-destructive/10 px-1 rounded">OMIE_APP_KEY</code> e <code className="bg-destructive/10 px-1 rounded">OMIE_APP_SECRET</code> nas variáveis de ambiente do projeto.
                  </p>
                  <div className="pt-2">
                    <a 
                      href="#" 
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider underline hover:opacity-80"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Acesse: Lovable Cloud → Settings → Environment/Secrets");
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Instruções de Configuração
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded border border-border bg-muted/5 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold text-navy uppercase tracking-wider">Base de Clientes</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Importação de cadastros da Omie para o Pátio Inteligente</p>
                  </div>
                  <Button 
                    className="w-full bg-navy gap-2 h-9 text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => mutationClientes.mutate()}
                    disabled={!omieStatus?.configured || mutationClientes.isPending}
                  >
                    {mutationClientes.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sincronizar Clientes Agora
                  </Button>
                </div>

                <div className="p-4 rounded border border-border bg-muted/5 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold text-navy uppercase tracking-wider">Resumo de Estoque</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Atualiza o cache local de peças e saldos disponíveis</p>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full border-navy/20 gap-2 h-9 text-[10px] font-bold uppercase tracking-widest text-navy"
                    onClick={() => mutationEstoque.mutate()}
                    disabled={!omieStatus?.configured || mutationEstoque.isPending}
                  >
                    {mutationEstoque.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sincronizar Estoque Agora
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <h4 className="text-[10px] font-bold text-navy uppercase tracking-widest">Logs de Sincronização Recentes</h4>
                </div>
                
                <div className="rounded border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 text-[9px] font-bold uppercase tracking-wider">Data/Hora</TableHead>
                        <TableHead className="h-9 text-[9px] font-bold uppercase tracking-wider">Entidade</TableHead>
                        <TableHead className="h-9 text-[9px] font-bold uppercase tracking-wider">Status</TableHead>
                        <TableHead className="h-9 text-[9px] font-bold uppercase tracking-wider">Mensagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs?.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-muted/5 border-border/50">
                          <TableCell className="py-2 text-[10px] font-medium text-muted-foreground">
                            {new Date(log.criado_em).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase rounded-xs px-1.5 py-0 border-border bg-white text-navy">
                              {log.entidade}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge className={cn(
                              "text-[8px] font-bold uppercase rounded-xs px-1.5 py-0 shadow-none border",
                              log.status === 'success' 
                                ? "bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-red-50 hover:bg-red-50 text-red-700 border-red-200"
                            )}>
                              {log.status === 'success' ? 'Sucesso' : 'Erro'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-[10px] font-medium text-primary leading-tight max-w-[200px] truncate">
                            {log.mensagem}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!syncLogs?.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center gap-2 opacity-20">
                              <Database className="w-8 h-8" />
                              <span className="text-[9px] uppercase font-bold tracking-widest">Nenhum registro</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
