import React, { useState, useEffect, useMemo } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChecklistTemplates, saveChecklist } from '../services/checklist.functions';
import { getOSList } from '@/features/os/services/os.functions';
import { ChecklistItem, type ChecklistResponse } from '../components/ChecklistItem';
import { ChecklistDiarioItem, type ChecklistDiarioResponse } from '../components/ChecklistDiarioItem';
import { SignaturePad } from '../components/SignaturePad';
import { db, saveOfflineResponse, markAsSynced } from '../lib/db';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Wifi, WifiOff, ArrowRight, ArrowLeft, ClipboardList, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';

const SETORES = ['Oficina Mecânica', 'Elétrica', 'Pintura', 'Almoxarifado', 'Escritório'];

export function ChecklistPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'selection' | 'tecnico' | 'diario'>('selection');
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [selectedSetor, setSelectedSetor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('0');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const today = new Date().toISOString().split('T')[0];

  // Queries
  const { data: tecnicoTemplates } = useSuspenseQuery({
    queryKey: ['checklist-templates', 'diagnostico_defeitos'],
    queryFn: () => getChecklistTemplates({ data: { tipo: 'diagnostico_defeitos' } })
  });

  const { data: diarioTemplates } = useSuspenseQuery({
    queryKey: ['checklist-templates', 'checklist_diario'],
    queryFn: () => getChecklistTemplates({ data: { tipo: 'checklist_diario' } })
  });

  const { data: osList } = useSuspenseQuery({
    queryKey: ['ordens-servico', 'abertas'],
    queryFn: () => getOSList()
  });

  // Offline Sync State
  const pendingResponses = useLiveQuery(
    () => mode === 'tecnico' 
      ? db.responses.where({ os_id: selectedOS, sincronizado: 0 }).toArray() 
      : db.responses.where({ setor: selectedSetor, data: today, sincronizado: 0 }).toArray(),
    [mode, selectedOS, selectedSetor, today]
  );

  const localResponses = useLiveQuery(
    () => mode === 'tecnico'
      ? db.responses.where({ os_id: selectedOS }).toArray()
      : db.responses.where({ setor: selectedSetor, data: today }).toArray(),
    [mode, selectedOS, selectedSetor, today]
  );

  const responsesMap = useMemo(() => {
    const map = new Map<string, any>();
    localResponses?.forEach((r: any) => {
      map.set(r.item_id, r);
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
        setMode('selection');
        setSelectedOS(null);
        setSelectedSetor(null);
        queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      }
    }
  });

  // Online/Offline Listeners and Auto-Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sincronizar automaticamente quando voltar online se não estiver no meio de um salvamento
      if (pendingResponses && pendingResponses.length > 0 && !syncMutation.isPending) {
        const currentResponses = Array.from(responsesMap.values());
        syncMutation.mutate({
          os_id: selectedOS,
          setor: selectedSetor,
          data: today,
          tipo: mode === 'tecnico' ? 'diagnostico_defeitos' : 'checklist_diario',
          respostas: currentResponses,
          finalizado: false
        });
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, pendingResponses, syncMutation, responsesMap, selectedOS, selectedSetor, today, mode]);

  const handleResponseChange = async (res: ChecklistResponse | ChecklistDiarioResponse) => {
    if (mode === 'tecnico' && selectedOS) {
      await saveOfflineResponse({
        os_id: selectedOS,
        tipo: 'diagnostico_defeitos',
        item_id: res.item_id,
        status: (res as ChecklistResponse).status,
        observacao: res.observacao || '',
        evidencias: (res as ChecklistResponse).evidencias || [],
        timestamp: Date.now(),
        sincronizado: 0
      } as any);
    } else if (mode === 'diario' && selectedSetor) {
      const dRes = res as ChecklistDiarioResponse;
      await saveOfflineResponse({
        os_id: null,
        setor: selectedSetor,
        data: today,
        tipo: 'checklist_diario',
        item_id: dRes.item_id,
        ok_abertura: dRes.ok_abertura,
        ok_fechamento: dRes.ok_fechamento,
        observacao: dRes.observacao || '',
        timestamp: Date.now(),
        sincronizado: 0
      } as any);
    }
  };

  const handleFinalize = async (signature: string) => {
    const templates = mode === 'tecnico' ? tecnicoTemplates : diarioTemplates;
    const allItensIds = templates.flatMap(t => (t.itens as any[]).map(i => i.id));
    const currentResponses = Array.from(responsesMap.values());
    
    if (mode === 'tecnico') {
      const faltam = allItensIds.filter(id => !responsesMap.has(id));
      if (faltam.length > 0) {
        toast.error(`Responda todos os itens (${faltam.length} pendentes)`);
        return;
      }
      syncMutation.mutate({
        os_id: selectedOS!,
        tipo: 'diagnostico_defeitos',
        respostas: currentResponses,
        assinatura_url: signature,
        finalizado: true
      });
    } else {
      syncMutation.mutate({
        os_id: null,
        setor: selectedSetor!,
        data: today,
        tipo: 'checklist_diario',
        respostas: currentResponses,
        assinatura_url: signature,
        finalizado: true
      });
    }
  };

  if (mode === 'selection') {
    return (
      <div className="p-10 max-w-5xl mx-auto space-y-12 bg-background min-h-screen">
        <div className="border-b border-border/50 pb-8 text-center sm:text-left">
          <h1 className="text-3xl font-black font-heading text-navy uppercase tracking-tighter">
            CENTRAL DE QUALIDADE
          </h1>
          <p className="text-xs text-muted-foreground mt-3 font-bold uppercase tracking-[0.3em] opacity-70">
            Inspeções Técnicas & Gestão 5S • Tecnoar Freios
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card 
            className="p-10 border-2 border-border/50 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all duration-300 group relative overflow-hidden flex flex-col items-center text-center space-y-6 shadow-md hover:shadow-xl"
            onClick={() => setMode('tecnico')}
          >
            <div className="w-20 h-20 rounded-xl bg-navy/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
              <ClipboardList className="w-10 h-10 text-navy group-hover:text-primary transition-all duration-300 group-hover:scale-110" />
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-black text-navy uppercase tracking-[0.15em]">INSPEÇÃO TÉCNICA</h2>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-80 max-w-[240px]">
                Diagnóstico detalhado de OS, defeitos e conferência final
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              Iniciar Checklist <ArrowRight className="w-3 h-3" />
            </div>
          </Card>

          <Card 
            className="p-10 border-2 border-border/50 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all duration-300 group relative overflow-hidden flex flex-col items-center text-center space-y-6 shadow-md hover:shadow-xl"
            onClick={() => setMode('diario')}
          >
            <div className="w-20 h-20 rounded-xl bg-navy/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-navy group-hover:text-primary transition-all duration-300 group-hover:scale-110" />
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-black text-navy uppercase tracking-[0.15em]">PROGRAMA 5S</h2>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest opacity-80 max-w-[240px]">
                Abertura e fechamento operacional dos setores da unidade
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              Realizar Rotina <ArrowRight className="w-3 h-3" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'tecnico' && !selectedOS) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 bg-background min-h-screen">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Button variant="ghost" size="sm" onClick={() => setMode('selection')} className="h-8 w-8 p-0 rounded-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold font-heading text-navy uppercase tracking-tight">SELECIONE A ORDEM DE SERVIÇO</h1>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Inspeção técnica vinculada a reparo</p>
          </div>
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
        </div>
      </div>
    );
  }

  if (mode === 'diario' && !selectedSetor) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 bg-background min-h-screen">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <Button variant="ghost" size="sm" onClick={() => setMode('selection')} className="h-8 w-8 p-0 rounded-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold font-heading text-navy uppercase tracking-tight">SELECIONE O SETOR</h1>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Checklist Diário 5S (FOR-OFI-001)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SETORES.map(setor => (
            <Card key={setor} className="rounded-sm border border-border shadow-xs bg-card p-6 hover:border-primary/40 cursor-pointer transition-colors group flex flex-col items-center text-center gap-3" onClick={() => setSelectedSetor(setor)}>
              <div className="w-10 h-10 rounded-sm bg-navy/5 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-navy opacity-40" />
              </div>
              <span className="font-bold text-xs text-navy uppercase tracking-widest">{setor}</span>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentOS = mode === 'tecnico' ? osList?.find(os => os.id === selectedOS) : null;
  const templates = mode === 'tecnico' ? tecnicoTemplates : diarioTemplates;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => mode === 'tecnico' ? setSelectedOS(null) : setSelectedSetor(null)} className="h-8 w-8 p-0 rounded-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="h-8 w-px bg-border mx-1" />
            <div>
              {mode === 'tecnico' ? (
                <>
                  <div className="font-bold font-mono text-xs text-navy opacity-50 leading-none">{currentOS?.protocolo}</div>
                  <div className="text-[11px] font-bold text-navy uppercase tracking-tight mt-1">{currentOS?.veiculos.placa_cavalo}</div>
                </>
              ) : (
                <>
                  <div className="font-bold font-mono text-xs text-navy opacity-50 leading-none">{today}</div>
                  <div className="text-[11px] font-bold text-navy uppercase tracking-tight mt-1">{selectedSetor}</div>
                </>
              )}
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
                  mode === 'tecnico' ? (
                    <ChecklistItem
                      key={item.id}
                      label={item.label}
                      itemId={item.id}
                      value={responsesMap.get(item.id) || { item_id: item.id, status: 'nao_aplica', observacao: '', evidencias: [] }}
                      onChange={handleResponseChange}
                    />
                  ) : (
                    <ChecklistDiarioItem
                      key={item.id}
                      label={item.label}
                      itemId={item.id}
                      value={responsesMap.get(item.id) || { item_id: item.id, ok_abertura: false, ok_fechamento: false, observacao: '' }}
                      onChange={handleResponseChange}
                      tipo={item.grupo === 'abertura' ? 'abertura' : item.grupo === 'fechamento' ? 'fechamento' : 'dual'}
                    />
                  )
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
                <h2 className="text-sm font-bold font-heading text-navy uppercase tracking-widest">
                  {mode === 'tecnico' ? 'CONCLUSÃO DA INSPEÇÃO' : 'FECHAMENTO DO DIA'}
                </h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-2 tracking-wider">
                  {mode === 'tecnico' ? 'Valide os dados e assine para oficializar o diagnóstico técnico' : 'Confirme as marcações e assine o checklist diário'}
                </p>
              </div>
              
              <div className="max-w-xs mx-auto py-6 border-y border-border space-y-3">
                <div className="flex justify-between text-[11px] font-bold text-navy uppercase tracking-wider">
                  <span className="opacity-50">Itens Respondidos:</span>
                  <span className="tabular-nums">{responsesMap.size} / {templates.reduce((acc: number, t: any) => acc + (t.itens as any[]).length, 0)}</span>
                </div>
              </div>

              <SignaturePad onSave={handleFinalize} />
              
              <div className="mt-8 pt-6 border-t border-border/50 text-left space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Código: FOR-OFI-001</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Revisão: 00</p>
              </div>

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