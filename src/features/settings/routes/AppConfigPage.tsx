import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Clock, ShieldCheck, Trophy, Database, MessageSquare, Briefcase } from 'lucide-react';

export default function AppConfigPage() {
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-orange" />
        <h2 className="text-3xl font-bold text-navy">Configurações do Sistema</h2>
      </div>

      <Tabs defaultValue="sla" className="w-full">
        <TabsList className="bg-navy/5 p-1 rounded-xl mb-6">
          <TabsTrigger value="sla" className="rounded-lg">SLA & Prazos</TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-lg">WhatsApp</TabsTrigger>
          <TabsTrigger value="omie" className="rounded-lg">Logs Omie</TabsTrigger>
        </TabsList>

        <TabsContent value="sla" className="space-y-6">
          <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan" />
                SLA de Fases (Horas)
              </CardTitle>
              <CardDescription>Defina os limites de tempo para alertas amarelo/vermelho por fase.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white border-l-4 border-l-orange">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange" />
                Integração WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-orange/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-orange" />
              </div>
              <h3 className="text-xl font-bold text-navy">Canal WhatsApp não configurado</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Para habilitar o envio automático e o atendimento via IA, configure as chaves da Meta Cloud API nas variáveis de ambiente do servidor (WHATSAPP_API_KEY).
              </p>
              <Button variant="outline" className="rounded-xl border-navy/20" disabled>
                Configurar API
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="omie" className="space-y-6">
          <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-navy" />
                Logs de Sincronização Omie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{new Date(log.criado_em).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{log.operacao}</TableCell>
                      <TableCell>
                        <Badge variant={log.sucesso ? 'default' : 'destructive'}>
                          {log.sucesso ? 'Sucesso' : 'Erro'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!syncLogs?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum log registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
