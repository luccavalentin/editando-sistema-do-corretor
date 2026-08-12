import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Briefcase, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { convertProcessoToTemplateFn } from '../lib/processos.functions';

export default function ProcessosPage() {
  const convertToTemplate = useServerFn(convertProcessoToTemplateFn);

  const { data: processos, refetch } = useQuery({
    queryKey: ['processos'],
    queryFn: async () => {
      const { data } = await supabase.from('processos').select('*');
      return data || [];
    }
  });

  const handleConvertToTemplate = async (id: string) => {
    toast.promise(convertToTemplate({ data: { processoId: id } }), {
      loading: 'Convertendo processo em checklist...',
      success: 'Processo agora é um template operacional!',
      error: 'Erro na conversão'
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-cyan" />
          <h2 className="text-xl font-bold text-navy">Processos Operacionais</h2>
        </div>
        <Button className="bg-navy gap-2 rounded-md">
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {processos?.map((proc: any) => (
          <Card key={proc.id} className="rounded-md border-none shadow-xs shadow-navy/5 bg-white flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge className="bg-cyan/10 text-cyan border-none">{proc.setor.toUpperCase()}</Badge>
              </div>
              <CardTitle className="text-navy">{proc.titulo}</CardTitle>
              <CardDescription>{proc.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>{proc.passos.length} passos</strong> definidos.
              </div>
            </CardContent>
            <div className="p-4 pt-0 mt-auto">
              <Button 
                variant="outline" 
                className="w-full rounded-md gap-2 border-navy/10"
                onClick={() => handleConvertToTemplate(proc.id)}
              >
                <CheckCircle2 className="w-4 h-4" /> Executar como Checklist
              </Button>
            </div>
          </Card>
        ))}

        {!processos?.length && (
          <div className="col-span-full py-20 text-center opacity-50">
            <Briefcase className="w-16 h-16 mx-auto text-navy mb-4" />
            <p className="text-xl">Nenhum processo administrativo cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
