import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Database, Send, AlertTriangle } from 'lucide-react';
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
    <div className='p-8 space-y-8 max-w-4xl mx-auto'>
      <div>
        <h1 className='text-3xl font-bold font-heading text-navy flex items-center gap-3'>
          <RefreshCw className="w-8 h-8 text-orange" />
          Configurações de Integração
        </h1>
        <p className='text-muted-foreground mt-1'>Gerencie a conexão real com a API Omie da Tecnoar.</p>
      </div>

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

      <div className="bg-orange/5 border border-orange/20 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-navy flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange" />
          Nota de Segurança
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          As chaves de API (<code className="bg-orange/10 px-1 rounded text-orange">OMIE_APP_KEY</code> e <code className="bg-orange/10 px-1 rounded text-orange">OMIE_APP_SECRET</code>) são gerenciadas via Environment Secrets no Lovable Cloud. Nunca são expostas ao cliente ou armazenadas no repositório.
        </p>
      </div>
    </div>
  );
}
