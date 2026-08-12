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
      <div className="p-6 max-w-4xl mx-auto space-y-6 bg-background min-h-screen">
        <div className="border-b border-border pb-4">
          <h1 className="text-lg font-bold font-heading text-navy uppercase tracking-tight">NOVO CHECKLIST TÉCNICO</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Selecione uma Ordem de Serviço para inspeção</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {osList?.filter(os => os.status === 'aberta' || os.status === 'checklist_diagnostico').map(os => (
            <Card key={os.id} className="rounded-sm border border-border shadow-xs bg-card p-4 hover:border-primary/40 cursor-pointer transition-colors group" onClick={() => setSelectedOS(os.id)}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-bold text-xs text-navy font-mono opacity-50">{os.protocolo}</div>
                  <div className="font-bold text-sm text-navy uppercase tracking-tight">{os.clientes.nome}</div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase">{os.veiculos.placa_cavalo} • {os.veiculos.modelo_cavalo}</div>
                </div>
                <span className="bg-navy/5 text-navy border border-navy/10 px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase tracking-tighter group-hover:bg-primary/5 group-hover:text-primary">
                  {os.status.replace('_', ' ')}
                </span>
              </div>
            </Card>
          ))}
          {osList?.length === 0 && (
            <div className="col-span-full p-12 text-center border border-dashed border-border rounded-sm bg-muted/10">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest italic opacity-40">Nenhuma Ordem de Serviço aberta disponível</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentOS = osList?.find(os => os.id === selectedOS);

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedOS(null)} className="h-8 w-8 p-0 rounded-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="h-8 w-px bg-border mx-1" />
            <div>
              <div className="font-bold font-mono text-xs text-navy opacity-50 leading-none">{currentOS?.protocolo}</div>
              <div className="text-[11px] font-bold text-navy uppercase tracking-tight mt-1">{currentOS?.veiculos.placa_cavalo} • {currentOS?.veiculos.modelo_cavalo}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <span className="bg-green-500/10 text-green-700 border border-green-500/20 px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> ONLINE
              </span>
            ) : (
              <span className="bg-orange/10 text-orange border border-orange/20 px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase flex items-center gap-1">
                <WifiOff className="w-2.5 h-2.5" /> OFFLINE
              </span>
            )}
            {pendingResponses && pendingResponses.length > 0 && (
              <span className="bg-primary text-white px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase tabular-nums">
                {pendingResponses.length} PENDENTES
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-7 h-auto p-1 bg-muted/50 border border-border rounded-sm mb-6">
            {templates.map((t, idx) => (
              <TabsTrigger key={t.id} value={idx.toString()} className="text-[10px] font-bold uppercase tracking-tighter py-2 rounded-xs px-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {t.secao.split(' ')[0]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="final" className="text-[10px] font-bold uppercase tracking-tight py-2 rounded-xs">FINALIZAR</TabsTrigger>
          </TabsList>

          {templates.map((section: any, idx: number) => (
            <TabsContent key={section.id} value={idx.toString()} className="space-y-6 pt-2">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="w-1.5 h-6 bg-primary rounded-xs" />
                <h2 className="text-xs font-bold font-heading text-navy uppercase tracking-[0.2em]">{section.secao}</h2>
              </div>
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
                <Button onClick={() => setActiveTab((idx + 1).toString())} className="bg-navy hover:bg-navy/90 text-white rounded-sm h-10 px-6 text-[10px] font-bold uppercase tracking-widest shadow-xs">
                  PRÓXIMA ETAPA
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Button>
              </div>
            </TabsContent>
          ))}

          <TabsContent value="final" className="space-y-4 pt-4">
            <div className="bg-card p-8 rounded-sm border border-border text-center space-y-6 shadow-xs">
              <div>
                <h2 className="text-sm font-bold font-heading text-navy uppercase tracking-widest">CONCLUSÃO DA INSPEÇÃO</h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-2 tracking-wider">
                  Valide os dados e assine para oficializar o diagnóstico técnico
                </p>
              </div>
              
              <div className="max-w-xs mx-auto py-6 border-y border-border space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-navy uppercase tracking-wider">
                  <span className="opacity-50">Itens Respondidos:</span>
                  <span className="tabular-nums">{responsesMap.size} / {templates.reduce((acc: number, t: any) => acc + (t.itens as any[]).length, 0)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-navy uppercase tracking-wider">
                  <span className="opacity-50">Irregularidades:</span>
                  <span className="text-red-600 tabular-nums">{Array.from(responsesMap.values()).filter(r => r.status === 'nao_ok').length}</span>
                </div>
              </div>

              <SignaturePad onSave={handleFinalize} />
              
              {syncMutation.isPending && (
                <div className="flex items-center justify-center gap-3 text-primary font-bold text-[10px] uppercase tracking-[0.2em] mt-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  SINCRONIZANDO COM SERVIDOR...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
