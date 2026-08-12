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
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-semibold text-primary uppercase tracking-tight">Follow-Up Inteligente</h2>
          <p className="text-[11px] text-muted-foreground font-medium uppercase mt-1.5 tracking-widest opacity-80">Geração de mensagens personalizadas via IA</p>
        </div>
        <Button onClick={handleGenerate} size="sm" className="h-9 px-6 bg-primary hover:bg-primary/90 text-white rounded-md text-[11px] font-semibold uppercase tracking-wider shadow-sm transition-all">
          <Wand2 className="w-3.5 h-3.5 mr-2.5 text-cyan" />
          Gerar Rascunhos
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {drafts?.map((draft: any) => (
          <Card key={draft.id} className="elevation-1 bg-card overflow-hidden group hover:elevation-2 transition-all">
            <CardHeader className="bg-muted/30 border-b border-border py-4 px-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-primary">{draft.clientes?.nome}</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-widest mt-1">Criado: {new Date(draft.criado_em).toLocaleDateString()}</CardDescription>
                </div>
                <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
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
          <div className="col-span-full py-24 text-center space-y-5 bg-muted/5 border border-dashed border-border rounded-lg">
            <MessageCircle className="w-16 h-16 mx-auto text-primary opacity-20" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-primary uppercase tracking-tight">Nenhum rascunho disponível</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">Clique em "Gerar Rascunhos" para a IA analisar sua base de clientes e sugerir ações de follow-up.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
