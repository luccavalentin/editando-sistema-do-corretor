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
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h2 className="text-sm font-bold text-navy uppercase tracking-widest">FOLLOW-UP INTELIGENTE</h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5 tracking-wider">Geração de mensagens personalizadas via IA</p>
        </div>
        <Button onClick={handleGenerate} size="sm" className="bg-navy hover:bg-navy/90 text-white rounded-sm text-[10px] font-bold uppercase tracking-widest h-8 px-4 shadow-xs">
          <Wand2 className="w-3.5 h-3.5 mr-2 text-cyan" />
          GERAR RASCUNHOS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {drafts?.map((draft: any) => (
          <Card key={draft.id} className="rounded-sm border border-border shadow-xs bg-card overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border py-3 px-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-navy">{draft.clientes?.nome}</CardTitle>
                  <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-widest mt-0.5">Criado: {new Date(draft.criado_em).toLocaleDateString()}</CardDescription>
                </div>
                <span className="bg-navy/5 text-navy border border-navy/10 px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase tracking-tighter">
                  {draft.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="bg-background border border-border rounded-sm p-4 text-[13px] leading-relaxed text-navy font-medium italic">
                "{draft.sugestao_texto}"
              </div>
              
              {draft.status === 'rascunho' && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" className="text-red-500 gap-1">
                    <X className="w-4 h-4" /> Rejeitar
                  </Button>
                  <Button 
                    onClick={() => handleApprove(draft.id, draft.sugestao_texto)}
                    className="bg-green-600 hover:bg-green-700 gap-1 rounded-md"
                  >
                    <Check className="w-4 h-4" /> Aprovar
                  </Button>
                </div>
              )}

              {draft.status === 'aprovada' && (
                <Button className="w-full bg-navy gap-2 rounded-md">
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
