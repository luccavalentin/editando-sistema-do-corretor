import React, { useState, useEffect, useMemo } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChecklistTemplates, saveChecklist } from '../lib/checklist.functions';
import { getOSList } from '@/integrations/management.functions';
import { ChecklistItem, type ChecklistResponse } from '../components/ChecklistItem';
import { SignaturePad } from '../components/SignaturePad';
import { db, saveOfflineResponse, markAsSynced } from '../lib/db';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Wifi, WifiOff, Send, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';

export function ChecklistPage() {
  const queryClient = useQueryClient();
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('0');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Queries
  const { data: templates } = useSuspenseQuery({
    queryKey: ['checklist-templates', 'diagnostico_defeitos'],
    queryFn: () => getChecklistTemplates({ data: { tipo: 'diagnostico_defeitos' } })
  });

  const { data: osList } = useSuspenseQuery({
    queryKey: ['ordens-servico', 'abertas'],
    queryFn: () => getOSList()
  });

  // Offline Sync State
  const pendingResponses = useLiveQuery(() => selectedOS ? db.responses.where({ os_id: selectedOS, sincronizado: 0 }).toArray() : [], [selectedOS]);
  const localResponses = useLiveQuery(() => selectedOS ? db.responses.where({ os_id: selectedOS }).toArray() : [], [selectedOS]);

  const responsesMap = useMemo(() => {
    const map = new Map<string, ChecklistResponse>();
    localResponses?.forEach((r: any) => {
      map.set(r.item_id, {
        item_id: r.item_id,
        status: r.status,
        observacao: r.observacao || '',
        evidencias: r.evidencias || []
      });
    });
    return map;
  }, [localResponses]);

  // Mutations
  const saveFn = useServerFn(saveChecklist);
  const syncMutation = useMutation({
    mutationFn: async (data: any) => saveFn(data),
    onSuccess: (_, variables) => {
      const ids = pendingResponses?.map(r => r.id!) || [];
      markAsSynced(ids);
      toast.success("Checklist sincronizado!");
      if (variables.finalizado) {
        setSelectedOS(null);
        queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      }
    }
  });

  // Online/Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && pendingResponses && pendingResponses.length > 0 && selectedOS) {
      // Logic for background sync could be here
    }
  }, [isOnline, pendingResponses, selectedOS]);

  const handleResponseChange = async (res: ChecklistResponse) => {
    if (!selectedOS) return;
    await saveOfflineResponse({
      os_id: selectedOS,
      tipo: 'diagnostico_defeitos',
      item_id: res.item_id,
      status: res.status,
      observacao: res.observacao || '',
      evidencias: res.evidencias || []
    });
  };

  const handleFinalize = async (signature: string) => {
    if (!selectedOS) return;
    
    // Validar se todos itens tem resposta e se nao_ok tem obs
    const allItensIds = templates.flatMap(t => (t.itens as any[]).map(i => i.id));
    const currentResponses = Array.from(responsesMap.values());
    
    const faltam = allItensIds.filter(id => !responsesMap.has(id));
    if (faltam.length > 0) {
      toast.error(`Responda todos os itens (${faltam.length} pendentes)`);
      return;
    }

    const semObs = currentResponses.filter(r => r.status === 'nao_ok' && !r.observacao);
    if (semObs.length > 0) {
      toast.error("Itens 'NÃO OK' exigem observação.");
      return;
    }

    if (!isOnline) {
      toast.warning("Você está offline. A finalização será enviada assim que a conexão retornar.");
      return;
    }

    syncMutation.mutate({
      os_id: selectedOS,
      tipo: 'diagnostico_defeitos',
      respostas: currentResponses,
      assinatura_url: signature,
      finalizado: true
    });
  };

  if (!selectedOS) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold font-space text-[#001830]">Novo Checklist</h1>
        <p className="text-muted-foreground">Selecione uma Ordem de Serviço aberta para iniciar a inspeção.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {osList?.filter(os => os.status === 'aberta' || os.status === 'checklist_diagnostico').map(os => (
            <Card key={os.id} className="p-4 hover:border-[#f06000] cursor-pointer transition-colors" onClick={() => setSelectedOS(os.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{os.protocolo}</div>
                  <div className="text-sm text-muted-foreground">Placa: {os.veiculos.placa_cavalo}</div>
                  <div className="text-sm font-medium">{os.clientes.nome}</div>
                </div>
                <Badge variant={os.status === 'aberta' ? 'outline' : 'default'} className="bg-cyan-500/10 text-cyan-600 border-cyan-200">
                  {os.status}
                </Badge>
              </div>
            </Card>
          ))}
          {osList?.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl">
              Nenhuma OS aberta encontrada.
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentOS = osList?.find(os => os.id === selectedOS);

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedOS(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="font-bold font-space">{currentOS?.protocolo}</div>
              <div className="text-xs text-muted-foreground">{currentOS?.veiculos.placa_cavalo} - {currentOS?.veiculos.modelo_cavalo}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <Wifi className="w-3 h-3 mr-1" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </Badge>
            )}
            {pendingResponses && pendingResponses.length > 0 && (
              <Badge className="bg-[#f06000]">{pendingResponses.length} pendentes</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-background border">
            {templates.map((t, idx) => (
              <TabsTrigger key={t.id} value={idx.toString()} className="text-[10px] sm:text-xs py-2">
                {t.secao.split(' ')[0]}...
              </TabsTrigger>
            ))}
            <TabsTrigger value="final" className="text-[10px] sm:text-xs py-2">Fim</TabsTrigger>
          </TabsList>

          {templates.map((section: any, idx: number) => (
            <TabsContent key={section.id} value={idx.toString()} className="space-y-4 pt-4">
              <h2 className="text-xl font-bold font-space px-2">{section.secao}</h2>
              <div className="grid gap-3">
                {(section.itens as any[]).map((item: any) => (
                  <ChecklistItem
                    key={item.id}
                    label={item.label}
                    itemId={item.id}
                    value={responsesMap.get(item.id) || { item_id: item.id, status: 'nao_aplica', observacao: '', evidencias: [] }}
                    onChange={handleResponseChange}
                  />
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setActiveTab((idx + 1).toString())} className="rounded-full px-8">
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </TabsContent>
          ))}

          <TabsContent value="final" className="space-y-6 pt-4">
            <div className="bg-card p-6 rounded-2xl border text-center space-y-4">
              <h2 className="text-xl font-bold font-space">Conclusão do Checklist</h2>
              <p className="text-muted-foreground text-sm">
                Revise os itens e assine abaixo para finalizar o diagnóstico técnico.
              </p>
              
              <div className="text-left py-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Itens Respondidos:</span>
                  <span className="font-bold">{responsesMap.size} / {templates.reduce((acc: number, t: any) => acc + (t.itens as any[]).length, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Irregularidades:</span>
                  <span className="font-bold text-red-600">{Array.from(responsesMap.values()).filter(r => r.status === 'nao_ok').length}</span>
                </div>
              </div>

              <SignaturePad onSave={handleFinalize} />
              
              {syncMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-[#f06000]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sincronizando...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
