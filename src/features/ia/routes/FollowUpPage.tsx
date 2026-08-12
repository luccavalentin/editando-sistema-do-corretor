import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageCircle, Check, X, Send, Wand2, User } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { generateFollowUpDraftsFn, approveFollowUpFn } from '../lib/followup.functions';

export default function FollowUpPage() {
  const generateDrafts = useServerFn(generateFollowUpDraftsFn);
  const approveDraft = useServerFn(approveFollowUpFn);

  const { data: drafts, refetch } = useQuery({
    queryKey: ['followup_drafts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ia_followup_mensagens')
        .select('*, clientes(nome)')
        .order('criado_em', { ascending: false });
      return data || [];
    }
  });

  const handleGenerate = async () => {
    toast.promise(generateDrafts(), {
      loading: 'IA analisando clientes e gerando rascunhos...',
      success: (data) => {
        refetch();
        return `${data.count} rascunhos gerados com sucesso!`;
      },
      error: 'Erro ao gerar rascunhos'
    });
  };

  const handleApprove = async (id: string, text: string) => {
    try {
      await approveDraft({ data: { id, textoEditado: text } });
      toast.success('Mensagem aprovada para envio');
      refetch();
    } catch (e) {
      toast.error('Erro ao aprovar mensagem');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-orange" />
          <h2 className="text-3xl font-bold text-navy">Follow-up Inteligente</h2>
        </div>
        <Button onClick={handleGenerate} className="bg-navy gap-2 rounded-xl">
          <Wand2 className="w-4 h-4" />
          Gerar Rascunhos via IA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {drafts?.map((draft: any) => (
          <Card key={draft.id} className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white overflow-hidden">
            <CardHeader className="bg-navy/5 border-b border-navy/5">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-navy">{draft.clientes?.nome}</CardTitle>
                  <CardDescription>Gerado em {new Date(draft.criado_em).toLocaleDateString()}</CardDescription>
                </div>
                <Badge variant={draft.status === 'rascunho' ? 'secondary' : 'default'}>
                  {draft.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-navy/5 p-4 rounded-xl text-sm italic text-navy/80 border border-navy/10">
                "{draft.sugestao_texto}"
              </div>
              
              {draft.status === 'rascunho' && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" className="text-red-500 gap-1">
                    <X className="w-4 h-4" /> Rejeitar
                  </Button>
                  <Button 
                    onClick={() => handleApprove(draft.id, draft.sugestao_texto)}
                    className="bg-green-600 hover:bg-green-700 gap-1 rounded-xl"
                  >
                    <Check className="w-4 h-4" /> Aprovar
                  </Button>
                </div>
              )}

              {draft.status === 'aprovada' && (
                <Button className="w-full bg-navy gap-2 rounded-xl">
                  <Send className="w-4 h-4" /> Enviar via WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {!drafts?.length && (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50">
            <MessageCircle className="w-16 h-16 mx-auto text-navy" />
            <p className="text-xl font-medium">Nenhum rascunho de follow-up disponível.</p>
            <p>Clique em "Gerar Rascunhos" para a IA analisar sua base de clientes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
