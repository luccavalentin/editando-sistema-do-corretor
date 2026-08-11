import React, { useState, useRef } from 'react';
import { useSuspenseQuery, useMutation } from '@tanstack/react-query';
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth.middleware";
import { getOSList } from '@/integrations/management.functions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SignaturePad } from '../../checklist/components/SignaturePad';
import { toast } from 'sonner';
import { FileText, Camera, Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';

export const saveTermo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .input(z.object({
    os_id: z.string(),
    dano_identificado: z.string(),
    fotos: z.array(z.string()).optional(),
    cliente_recusou_servico: z.boolean(),
    assinatura_cliente_url: z.string()
  }))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase
      .from('termos_responsabilidade')
      .insert({
        ...data,
        criado_por: context.userId
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return result;
  });

export function TermoResponsabilidadePage() {
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [dano, setDano] = useState('');
  const [recusou, setRecusou] = useState(false);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: osList } = useSuspenseQuery({
    queryKey: ['ordens-servico', 'ativas'],
    queryFn: () => getOSList()
  });

  const saveTermoFn = useServerFn(saveTermo);
  const mutation = useMutation({
    mutationFn: (data: any) => saveTermoFn(data),
    onSuccess: () => {
      toast.success("Termo de responsabilidade gerado com sucesso!");
      setIsPrinting(true);
    }
  });

  const handleSave = () => {
    if (!selectedOS || !dano || !assinatura) {
      toast.error("Preencha todos os campos obrigatórios e colete a assinatura.");
      return;
    }
    mutation.mutate({
      os_id: selectedOS,
      dano_identificado: dano,
      cliente_recusou_servico: recusou,
      assinatura_cliente_url: assinatura
    });
  };

  if (isPrinting) {
    const os = osList.find(o => o.id === selectedOS);
    return (
      <div className="p-8 max-w-2xl mx-auto bg-white text-black print:p-0">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="ghost" onClick={() => setIsPrinting(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={() => window.print()} className="bg-[#f06000]">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Termo
          </Button>
        </div>
        
        <div className="border-2 border-black p-8 space-y-6">
          <div className="text-center space-y-2 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold uppercase">Termo de Responsabilidade e Ciência</h1>
            <p className="text-sm font-bold">TECNOAR FREIOS - Iracemápolis/SP</p>
          </div>

          <div className="space-y-4 text-sm leading-relaxed">
            <p><strong>PROTOCOLO OS:</strong> {os?.protocolo}</p>
            <p><strong>CLIENTE:</strong> {os?.clientes.nome}</p>
            <p><strong>VEÍCULO:</strong> {os?.veiculos.modelo_cavalo} ({os?.veiculos.placa_cavalo})</p>
            
            <div className="pt-4">
              <h2 className="font-bold underline mb-2">DESCRIÇÃO DO DANO/DEFEITO IDENTIFICADO:</h2>
              <p className="min-h-[100px] border p-2">{dano}</p>
            </div>

            <p className="text-justify font-bold italic">
              "Declaro estar ciente dos danos técnicos identificados no veículo acima descrito. 
              {recusou ? " Optei por NÃO realizar o serviço recomendado pela Tecnoar Freios neste momento, assumindo total responsabilidade por eventuais falhas decorrentes desta decisão." : " Autorizo a continuidade do serviço sob minha ciência técnica."}"
            </p>
          </div>

          <div className="pt-12 flex flex-col items-center gap-4">
            {assinatura && <img src={assinatura} alt="Assinatura" className="max-h-24 border-b border-black" />}
            <div className="w-64 border-t border-black text-center pt-2 text-xs font-bold">
              ASSINATURA DO CLIENTE / RESPONSÁVEL
            </div>
          </div>

          <div className="text-[10px] text-center pt-8 text-gray-500">
            Gerado digitalmente em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-[#f06000]" />
        <div>
          <h1 className="text-2xl font-bold font-space text-[#001830]">Termo de Responsabilidade</h1>
          <p className="text-muted-foreground">Registro de recusa de serviço ou ciência de danos graves.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="p-4 space-y-4">
          <Label>Selecione a Ordem de Serviço</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {osList.map(os => (
              <div 
                key={os.id} 
                onClick={() => setSelectedOS(os.id)}
                className={cn(
                  "p-3 border rounded-xl cursor-pointer transition-all",
                  selectedOS === os.id ? "border-[#f06000] bg-[#f06000]/5 ring-1 ring-[#f06000]" : "hover:border-gray-300"
                )}
              >
                <div className="font-bold">{os.protocolo}</div>
                <div className="text-xs text-muted-foreground">{os.veiculos.placa_cavalo} - {os.clientes.nome}</div>
              </div>
            ))}
          </div>
        </Card>

        {selectedOS && (
          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dano">Descrição do Dano/Risco Identificado *</Label>
              <Textarea 
                id="dano" 
                placeholder="Descreva detalhadamente o que foi encontrado e os riscos associados..." 
                className="min-h-[120px]"
                value={dano}
                onChange={(e) => setDano(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 bg-muted/50 p-4 rounded-xl border border-amber-200">
              <Checkbox 
                id="recusa" 
                checked={recusou} 
                onCheckedChange={(checked) => setRecusou(!!checked)} 
              />
              <label htmlFor="recusa" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                O cliente RECUSOU a execução do serviço recomendado.
              </label>
            </div>

            <div className="space-y-2">
              <Label>Fotos das Evidências</Label>
              <Button variant="outline" className="w-full h-24 border-dashed rounded-2xl">
                <Camera className="w-6 h-6 mr-2" /> Capturar/Upload de Fotos
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Assinatura do Cliente *</Label>
              <SignaturePad onSave={setAssinatura} label="Coletar Assinatura no Tablet" />
            </div>

            <Button 
              className="w-full h-12 text-lg font-bold bg-[#f06000] hover:bg-[#d05000] rounded-full"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Printer className="w-6 h-6 mr-2" />}
              Gerar Termo e Imprimir
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

// Utility class since it's used inline and might not be globally available in all contexts if not careful
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
