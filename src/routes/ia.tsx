
import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FollowUpPage from '@/features/ia/routes/FollowUpPage';
import { 
  Bot, 
  Send, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Library, 
  Settings, 
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  History,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServerFn } from '@tanstack/react-start';
import { iaChat, getBaseConhecimento, getIAConfig, updateIAConfig } from '@/features/library/lib/ia.functions';
import { toast } from 'sonner';

export const Route = createFileRoute('/ia')({
  component: IAModule,
});

function IAModule() {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();
  const chatFn = useServerFn(iaChat);
  const knowledgeFn = useServerFn(getBaseConhecimento);
  const configFn = useServerFn(getIAConfig);
  const updateConfigFn = useServerFn(updateIAConfig);

  const { data: config } = useQuery({
    queryKey: ['ia-config'],
    queryFn: () => configFn()
  });

  const { data: knowledge } = useQuery({
    queryKey: ['ia-knowledge'],
    queryFn: () => knowledgeFn({} as any)
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => chatFn({ mensagem: msg } as any),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['ia-history'] });
    }
  });

  const configMutation = useMutation({
    mutationFn: (provider: string) => updateConfigFn({ provider_ativo: provider } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia-config'] });
      toast.success('Provedor atualizado com sucesso');
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    chatMutation.mutate(message);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar do Módulo */}
      <div className="w-60 bg-navy flex flex-col border-r border-white/5">
        <div className="p-6 border-b border-white/5 mb-2">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-cyan" />
            <h1 className="text-white font-heading font-bold text-sm uppercase tracking-widest">CENTRO IA</h1>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full flex-1">
          <TabsList className="flex flex-col h-auto bg-transparent gap-0.5 px-2">
            {[
              { value: 'chat', label: 'Chat Técnico', icon: Bot },
              { value: 'library', label: 'Biblioteca', icon: Library },
              { value: 'followup', label: 'Follow-up', icon: MessageCircle },
              { value: 'history', label: 'Histórico', icon: History },
              { value: 'settings', label: 'Configurações', icon: Settings },
            ].map(tab => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="w-full justify-start gap-3 rounded-sm py-2 px-3 text-[12px] font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white/10 data-[state=active]:text-orange data-[state=active]:border-l-2 data-[state=active]:border-orange text-white/80 hover:bg-white/5"
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="chat" className="h-full m-0 flex flex-col">
            <div className="p-4 border-b bg-muted/20 flex justify-between items-end">
              <div>
                <h2 className="text-sm font-bold text-navy uppercase tracking-widest">DIAGNÓSTICO TÉCNICO IA</h2>
                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5 tracking-wider">Especialista em Freios a Ar e Pneumática</p>
              </div>
              <span className="bg-navy/5 text-navy border border-navy/10 px-2 py-0.5 rounded-xs text-[9px] font-bold uppercase tracking-widest">
                MODO: {config?.provider_ativo?.toUpperCase() || 'GEMINI'}
              </span>
            </div>

            <ScrollArea className="flex-1 p-5">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-sm bg-navy flex items-center justify-center shrink-0 border border-white/10">
                    <Bot className="w-4 h-4 text-cyan" />
                  </div>
                  <div className="bg-muted/50 p-4 rounded-sm rounded-tl-none border border-border max-w-[85%]">
                    <p className="text-xs font-medium leading-relaxed text-navy uppercase tracking-wider mb-2 opacity-80">Assistente Tecnoar</p>
                    <p className="text-sm text-navy font-medium">Olá! Sou o assistente técnico da Tecnoar. Como posso ajudar com o diagnóstico hoje?</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-sm text-xs" onClick={() => setMessage('Como diagnosticar vazamento na válvula APU?')}>Vazamento APU</Button>
                      <Button variant="outline" size="sm" className="rounded-sm text-xs" onClick={() => setMessage('Esquema elétrico do ABS Knorr-Bremse')}>ABS Knorr</Button>
                      <Button variant="outline" size="sm" className="rounded-sm text-xs" onClick={() => setMessage('Calibração do servo de embreagem Scania')}>Servo Scania</Button>
                    </div>
                  </div>
                </div>

                {chatMutation.isPending && (
                  <div className="flex gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-orange/50" />
                    <div className="bg-white/50 p-4 rounded-md w-64 h-16" />
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 bg-white border-t">
              <div className="max-w-3xl mx-auto flex gap-4 items-end">
                <div className="flex-1 bg-muted/50 border border-border rounded-sm px-4 py-2 flex items-center gap-3">
                  <Input 
                    placeholder="Descreva o problema ou envie uma foto..." 
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm text-navy font-medium"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button variant="ghost" size="icon" className="text-navy/40 hover:text-orange">
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={isRecording ? "text-orange animate-pulse" : "text-navy/40"}
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                </div>
                <Button 
                  onClick={handleSend}
                  disabled={!message.trim() || chatMutation.isPending}
                  className="bg-navy hover:bg-navy/90 text-white rounded-sm h-11 w-11 flex items-center justify-center p-0 shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="h-full m-0 p-5">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-bold text-navy font-heading">Biblioteca Técnica</h2>
                  <p className="text-muted-foreground">Documentação, Manuais e FAQs validados</p>
                </div>
                <div className="w-72 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/40" />
                  <Input placeholder="Pesquisar na base..." className="pl-10 rounded-md bg-white border-navy/10" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['ABS/EBS', 'Circuito Pneumático', 'Válvulas', 'Diagnóstico'].map(cat => (
                  <Card key={cat} className="rounded-md border-none shadow-xs hover:shadow-sm transition-shadow cursor-pointer bg-white group">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-4">
                      <div className="w-12 h-12 rounded-md bg-navy/5 flex items-center justify-center group-hover:bg-orange/10 transition-colors">
                        <BookOpen className="w-6 h-6 text-navy group-hover:text-orange" />
                      </div>
                      <h3 className="font-bold text-navy">{cat}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-navy flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange" /> Artigos Recentes
                </h3>
                {knowledge?.map((item: any) => (
                  <Card key={item.id} className="rounded-md border-navy/5 shadow-sm hover:border-orange/20 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-navy/40" />
                        </div>
                        <div>
                          <h4 className="font-bold text-navy">{item.titulo}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] uppercase">{item.marca}</Badge>
                            <Badge variant="outline" className="text-[10px] uppercase">{item.categoria}</Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-orange font-bold">Ver Fragmentos</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="followup" className="h-full m-0 p-5 overflow-auto">
            <FollowUpPage />
          </TabsContent>

          <TabsContent value="settings" className="h-full m-0 p-5">
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy font-heading">Configurações de IA</h2>
                <p className="text-muted-foreground">Controle de provedores e parâmetros do sistema</p>
              </div>

              <Card className="rounded-lg border-navy/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-navy text-white p-5">
                  <CardTitle className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-cyan" /> Provedor Ativo
                  </CardTitle>
                  <CardDescription className="text-white/80">Escolha o modelo de IA que responderá no chat técnico</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { id: 'gemini', name: 'Google Gemini', desc: 'Nativo multimodal, áudio e vídeo.' },
                      { id: 'openai', name: 'OpenAI GPT-4', desc: 'Líder em raciocínio lógico e diagnóstico.' },
                      { id: 'claude', name: 'Anthropic Claude', desc: 'Melhor compreensão de documentação técnica.' }
                    ].map(p => (
                      <div 
                        key={p.id}
                        onClick={() => configMutation.mutate(p.id)}
                        className={`p-4 rounded-md border-2 transition-all cursor-pointer flex items-center justify-between ${
                          config?.provider_ativo === p.id 
                            ? 'border-orange bg-orange/5' 
                            : 'border-navy/5 hover:border-navy/20'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-md flex items-center justify-center ${
                            config?.provider_ativo === p.id ? 'bg-orange text-white' : 'bg-navy/5 text-navy'
                          }`}>
                            <Bot className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-navy">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                          </div>
                        </div>
                        {config?.provider_ativo === p.id && (
                          <CheckCircle2 className="w-6 h-6 text-orange" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-md bg-amber-50 border border-amber-200 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Sistema de Fallback Ativo</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Se o provedor escolhido falhar, o sistema tentará automaticamente os outros da lista para garantir a disponibilidade.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
