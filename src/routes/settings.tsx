import { createFileRoute } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersPage from '@/features/users/routes/UsersPage';
import AppConfigPage from '@/features/settings/routes/AppConfigPage';
import ProcessosPage from '@/features/checklist/routes/ProcessosPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Database, Send, AlertTriangle, Settings, Users, Briefcase } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { syncClientesOmie, syncEstoqueOmie } from '@/features/omie/services/omie.functions';
import { toast } from 'sonner';
import { useState } from 'react';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const syncClientes = useServerFn(syncClientesOmie);
  const syncEstoque = useServerFn(syncEstoqueOmie);

  const handleSync = async (type: 'clientes' | 'estoque') => {
    setLoading(type);
    try {
      if (type === 'clientes') await syncClientes();
      else await syncEstoque();
      toast.success(`Sincronização de ${type} concluída!`);
    } catch (error: any) {
      toast.error(`Falha na sincronização: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className='p-6 space-y-6 bg-background min-h-screen'>
      <div className="border-b border-border pb-4">
        <h1 className='text-lg font-bold font-heading text-navy uppercase tracking-tight'>CONFIGURAÇÕES E INTEGRAÇÕES</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Painel administrativo e controle de sistemas externos</p>
      </div>

      <Tabs defaultValue="integracoes" className="w-full">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-sm h-10 mb-6">
          <TabsTrigger value="integracoes" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">INTEGRAÇÕES</TabsTrigger>
          <TabsTrigger value="config" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">SISTEMA</TabsTrigger>
          <TabsTrigger value="processos" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">PROCESSOS</TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">USUÁRIOS</TabsTrigger>
        </TabsList>
        <TabsContent value="integracoes" className="space-y-4">
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <Card className="rounded-sm border border-border shadow-xs bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border py-4 px-4">
                <div className="flex justify-between items-center">
                  <Database className="w-4 h-4 text-primary" />
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                </div>
                <CardTitle className="mt-3 text-xs font-bold uppercase tracking-widest text-navy">SINCRONIZAÇÃO OMIE</CardTitle>
                <CardDescription className="text-[10px] uppercase font-semibold text-muted-foreground/80 tracking-wider">Clientes e Estoque em tempo real</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Button 
                  className="w-full rounded-md gap-2 bg-navy" 
                  onClick={() => handleSync('clientes')}
                  disabled={loading !== null}
                >
                  <RefreshCw className={loading === 'clientes' ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
                  Sincronizar Clientes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full rounded-md gap-2 border-navy/10"
                  onClick={() => handleSync('estoque')}
                  disabled={loading !== null}
                >
                  <RefreshCw className={loading === 'estoque' ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
                  Sincronizar Estoque
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-md border-none shadow-xs shadow-navy/5 bg-white overflow-hidden group">
              <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                  <Send className="w-8 h-8 text-orange" />
                </div>
                <CardTitle className="mt-4">Envio de OS</CardTitle>
                <CardDescription>Regras para exportação financeira</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 text-orange" />
                  <span>Exportação automática em "Financeiro"</span>
                </div>
                <p className="text-xs">
                  As OS são enviadas para a Omie assim que o status muda para "Enviado Financeiro" no Dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="config">
          <AppConfigPage />
        </TabsContent>
        <TabsContent value="processos">
          <ProcessosPage />
        </TabsContent>
        <TabsContent value="usuarios">
          <UsersPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
