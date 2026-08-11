import React, { useState } from 'react';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { getOSList } from '@/integrations/management.functions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SignaturePad } from '../components/SignaturePad';
import { toast } from 'sonner';
import { Camera, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { saveChecklist } from '../lib/checklist.functions';

export function EstadoCaminhaoPage() {
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [obs, setObs] = useState('');
  const [assinatura, setAssinatura] = useState<string | null>(null);

  const { data: osList } = useSuspenseQuery({
    queryKey: ['ordens-servico', 'ativas'],
    queryFn: () => getOSList()
  });

  const saveChecklistFn = useServerFn(saveChecklist);
  const mutation = useMutation({
    mutationFn: (data: any) => saveChecklistFn(data),
    onSuccess: () => {
      toast.success("Estado do caminhão registrado. OS enviada para retirada!");
      setSelectedOS(null);
    }
  });

  const handleFinalize = () => {
    if (!selectedOS || !assinatura) {
      toast.error("A assinatura é obrigatória.");
      return;
    }
    mutation.mutate({
      os_id: selectedOS,
      tipo: 'estado_caminhao',
      respostas: [{ item_id: 'geral', status: 'ok', observacao: obs }],
      assinatura_url: assinatura,
      finalizado: true
    });
  };

  if (!selectedOS) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold font-space text-[#001830]">Estado do Caminhão & Entrega</h1>
        <p className="text-muted-foreground">Compare o estado de entrada com o de saída e registre a entrega.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {osList.map(os => (
            <Card key={os.id} className="p-4 cursor-pointer hover:border-[#f06000]" onClick={() => setSelectedOS(os.id)}>
              <div className="font-bold">{os.protocolo}</div>
              <div className="text-sm">{os.veiculos.placa_cavalo} - {os.clientes.nome}</div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentOS = osList.find(o => o.id === selectedOS);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedOS(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold font-space">Entrega Técnica: {currentOS?.protocolo}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" /> Fotos de Entrada
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {currentOS?.fotos_entrada?.length ? currentOS.fotos_entrada.map((url: string, i: number) => (
              <img key={i} src={url} alt="Entrada" className="aspect-square object-cover rounded-lg bg-muted" />
            )) : (
              <div className="col-span-2 py-8 text-center text-xs text-muted-foreground bg-muted rounded-lg italic">
                Nenhuma foto de entrada registrada.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#f06000]" /> Fotos de Saída (Final)
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="aspect-square border-dashed">
              <Camera className="w-6 h-6" />
            </Button>
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground italic">
              Aguardando fotos...
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label>Observações de Saída</Label>
          <Textarea 
            placeholder="Relate o estado geral na entrega, avisos ao motorista, etc."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Assinatura de Retirada (Cliente/Motorista)</Label>
          <SignaturePad onSave={setAssinatura} />
        </div>

        <Button 
          className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold rounded-full text-lg"
          onClick={handleFinalize}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <ArrowRight className="w-6 h-6 mr-2" />}
          Finalizar e Liberar Veículo
        </Button>
      </Card>
    </div>
  );
}
