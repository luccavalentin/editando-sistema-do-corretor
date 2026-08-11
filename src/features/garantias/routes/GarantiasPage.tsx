import React, { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth.middleware";
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getGarantias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .input(z.object({ search: z.string().optional() }))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from('checklist_garantias')
      .select(`
        *,
        checklists!inner (
          id,
          os_id,
          ordens_servico!inner (
            protocolo,
            clientes!inner (nome),
            veiculos!inner (placa_cavalo)
          )
        )
      \`)
      .order('vencimento_em', { ascending: true });

    if (data.search) {
      // Simplificado para busca básica
      query = query.or(\`item_descricao.ilike.%\${data.search}%,tipo.ilike.%\${data.search}%\`);
    }

    const { data: result, error } = await query;
    if (error) throw new Error(error.message);
    return result;
  });

export function GarantiasPage() {
  const [search, setSearch] = useState('');
  const { data: garantias } = useSuspenseQuery({
    queryKey: ['garantias', search],
    queryFn: () => getGarantias({ search })
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space text-[#001830]">Garantias</h1>
          <p className="text-muted-foreground">Monitoramento de prazos de peças e serviços.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por item, cliente ou placa..." 
            className="pl-10 rounded-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {garantias.map((g: any) => {
          const vencimento = new Date(g.vencimento_em);
          const diasParaVencer = differenceInDays(vencimento, new Date());
          const vencida = isPast(vencimento);
          const emDestaque = diasParaVencer <= 30 && !vencida;

          return (
            <Card key={g.id} className="p-4 flex flex-col justify-between border-l-4 border-l-cyan-500">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="capitalize">
                    {g.tipo === 'peca' ? 'Peça' : 'Serviço'}
                  </Badge>
                  {vencida ? (
                    <Badge variant="destructive" className="animate-pulse">VENCIDA</Badge>
                  ) : emDestaque ? (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Vence em {diasParaVencer} dias</Badge>
                  ) : (
                    <Badge variant="secondary">Ativa</Badge>
                  )}
                </div>
                
                <h3 className="font-bold text-lg leading-tight">{g.item_descricao}</h3>
                
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-[#001830]">Cliente:</span>
                    {g.checklists.ordens_servico.clientes.nome}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-[#001830]">Veículo:</span>
                    {g.checklists.ordens_servico.veiculos.placa_cavalo}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-[#001830]">OS:</span>
                    {g.checklists.ordens_servico.protocolo}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(vencimento, "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <div className="flex items-center font-bold text-[#001830]">
                  <ShieldCheck className="w-4 h-4 mr-1 text-green-500" />
                  {g.meses_garantia} meses
                </div>
              </div>
            </Card>
          );
        })}
        {garantias.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
            Nenhuma garantia encontrada para esta busca.
          </div>
        )}
      </div>
    </div>
  );
}
