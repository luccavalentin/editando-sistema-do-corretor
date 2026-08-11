import { createFileRoute } from '@tanstack/react-router';
import { 
  Bot, 
  Cpu, 
  Zap, 
  Shield, 
  Plus, 
  ExternalLink,
  MessageSquare,
  Wrench,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/ia')({
  component: IAModule,
});

function IAModule() {
  return (
    <div className="p-8 space-y-8 bg-navy/5 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-heading text-navy flex items-center gap-3">
            <Bot className="w-8 h-8 text-orange" />
            Centro de Inteligência Tecnoar
          </h1>
          <p className="text-muted-foreground mt-1">Integração de Agentes e Model Context Protocol (MCP)</p>
        </div>
        <Button className="bg-navy text-white hover:bg-navy/90 rounded-full gap-2 px-6 shadow-lg shadow-navy/20">
          <Plus className="w-4 h-4 text-cyan" />
          Novo Agente MCP
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white overflow-hidden group">
          <CardHeader className="bg-navy p-6">
            <div className="flex justify-between items-center">
              <Cpu className="w-8 h-8 text-cyan" />
              <Badge variant="outline" className="text-cyan border-cyan/20">Ativo</Badge>
            </div>
            <CardTitle className="text-white mt-4">Agente Logístico</CardTitle>
            <CardDescription className="text-white/60">Otimização de pátio e previsão de SLA</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="w-4 h-4 text-orange" />
              <span>Ferramentas: Gestão de OS, Fluxo de Pátio</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-cyan" />
              <span>Dados: Histórico de Tempos, Checklist</span>
            </div>
            <Button variant="outline" className="w-full rounded-xl gap-2 mt-2">
              <MessageSquare className="w-4 h-4" />
              Abrir Chat de Análise
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white overflow-hidden group">
          <CardHeader className="bg-orange/10 p-6">
            <div className="flex justify-between items-center">
              <Zap className="w-8 h-8 text-orange" />
              <Badge variant="outline" className="text-orange border-orange/20">Externo</Badge>
            </div>
            <CardTitle className="text-navy mt-4">Integração Omie MCP</CardTitle>
            <CardDescription className="text-navy/60">Sincronização financeira e fiscal</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="w-4 h-4 text-navy/40" />
              <span>Host: api.tecnoar.omie.com.br</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-green-600" />
              <span>Status: Conexão Segura</span>
            </div>
            <Button variant="outline" className="w-full rounded-xl gap-2 mt-2">
              <SettingsIcon className="w-4 h-4" />
              Configurar Webhooks
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-2 border-dashed border-navy/10 bg-transparent flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-navy/5 flex items-center justify-center">
            <Plus className="w-8 h-8 text-navy/20" />
          </div>
          <div>
            <h3 className="font-bold text-navy">Adicionar Integração</h3>
            <p className="text-sm text-muted-foreground mt-1">Conecte novos modelos de IA via MCP para expandir as capacidades do pátio.</p>
          </div>
          <Button variant="ghost" className="text-orange font-bold hover:bg-orange/5">
            Explorar Marketplace MCP
          </Button>
        </Card>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-md shadow-navy/5 border border-navy/5">
        <h2 className="text-xl font-bold font-heading text-navy mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan" />
          Logs de Auditoria de IA
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-navy/5 border border-navy/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-navy/10">
                  <Bot className="w-5 h-5 text-navy" />
                </div>
                <div>
                  <p className="text-sm font-bold text-navy">Ação: Sugestão de Repriorização de OS</p>
                  <p className="text-xs text-muted-foreground">Agente Logístico • TNR-2024-000452</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono font-bold text-navy/40">11/08/2026 14:32</p>
                <Badge variant="secondary" className="bg-green-100 text-green-700 mt-1 border-none">Validado</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return <Wrench className={className} />;
}
