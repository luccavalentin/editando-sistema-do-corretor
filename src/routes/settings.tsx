import { createFileRoute } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UsersPage from '@/features/users/routes/UsersPage';
import AppConfigPage from '@/features/settings/routes/AppConfigPage';
import ProcessosPage from '@/features/checklist/routes/ProcessosPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Database, Send, AlertTriangle, Settings, Users, Briefcase } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { syncClientesOmie, syncEstoqueOmie } from '@/integrations/omie.functions';
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
    <div className='p-8 space-y-8'>
      <h1 className='text-3xl font-bold font-heading text-navy'>Configurações</h1>
      <Tabs defaultValue="integracoes" className="w-full">
        <TabsList className="bg-navy/5 p-1 rounded-xl mb-6">
          <TabsTrigger value="integracoes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-navy">Integrações</TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-navy">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="integracoes" className="space-y-6">
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white overflow-hidden group">
              <CardHeader className="p-6">
                <div className="flex justify-between items-center">
                  <Database className="w-8 h-8 text-cyan" />
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <CardTitle className="mt-4">Sincronização de Dados</CardTitle>
                <CardDescription>Clientes e Estoque da Tecnoar (Omie)</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button 
                  className="w-full rounded-xl gap-2 bg-navy" 
                  onClick={() => handleSync('clientes')}
                  disabled={loading !== null}
                >
                  <RefreshCw className={loading === 'clientes' ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
                  Sincronizar Clientes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full rounded-xl gap-2 border-navy/10"
                  onClick={() => handleSync('estoque')}
                  disabled={loading !== null}
                >
                  <RefreshCw className={loading === 'estoque' ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
                  Sincronizar Estoque
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white overflow-hidden group">
              <CardHeader className="p-6">
                <div className="flex justify-between items-center">
                  <Send className="w-8 h-8 text-orange" />
                </div>
                <CardTitle className="mt-4">Envio de OS</CardTitle>
                <CardDescription>Regras para exportação financeira</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
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
        <TabsContent value="usuarios">
          <UsersPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
