import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { searchClienteLocal, openOS } from '@/features/os/services/os.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Truck, Plus, Printer, Camera, Search, RefreshCw, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/management')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab as string | undefined,
  }),
  component: ManagementPage,
});

function ManagementPage() {
  const { tab } = Route.useSearch();
  const [activeTab, setActiveTab] = useState(tab || 'os');
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);
  const [osData, setOsData] = useState({
    box: '',
    motorista_cliente: '',
    km_entrada: 0,
    observacoes_gerais: ''
  });

  const searchFn = useServerFn(searchClienteLocal);
  const openOSFn = useServerFn(openOS);

  const handleSearch = async () => {
    try {
      const results = await searchFn({ data: { query: searchQuery } });
      if (results && results.length > 0) {
        setSelectedCliente(results[0]);
        setStep(2);
      } else {
        toast.info("Cliente não encontrado localmente. Busca na Omie disponível em breve.");
      }
    } catch (error) {
      toast.error("Erro ao buscar cliente");
    }
  };

  const handleFinish = async () => {
    try {
      const os = await openOSFn({ 
        data: {
          cliente_id: selectedCliente.id,
          veiculo_id: selectedVeiculo?.id || '', // Simplificado para o prompt
          ...osData
        }
      });
      toast.success(`OS ${os.protocolo} aberta com sucesso!`);
      window.print();
    } catch (error) {
      toast.error("Erro ao abrir OS");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-background min-h-screen print:p-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="bg-muted/50 p-1 border border-border rounded-sm h-10 mb-6">
          <TabsTrigger value="os" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="clientes" className="rounded-xs text-[11px] font-bold uppercase tracking-wider px-4">Clientes (OMIE)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="os" className="space-y-6">
          <div className="space-y-6">

      <div className="flex justify-between items-end border-b border-border pb-6 print:hidden">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-primary uppercase tracking-tight">
            Gestão Operacional
          </h1>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] opacity-60">
            Abertura de Ordens de Serviço • Central Léo
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-muted/30 border border-border px-3 py-1.5 rounded text-[10px] font-semibold text-primary uppercase tracking-wider shadow-none">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />
            Léo • Master Op
          </div>
        </div>
      </div>

      {/* OS Print View (Hidden on Screen) */}
      <div className="hidden print:block p-5 font-sans">
        <div className="flex justify-between border-b-2 border-navy pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-navy">TECNOAR FREIOS</h2>
            <p className="text-xs">Iracemápolis - SP | (19) 3456-7890</p>
            <p className="text-xs">Especialista em Freio a Ar</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-navy">ORDEM DE SERVIÇO</p>
            <p className="text-xl font-mono">TNR-2026-000001</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Cliente</p>
            <p className="font-bold">{selectedCliente?.nome || 'NOME DO CLIENTE'}</p>
            <p className="text-sm">{selectedCliente?.documento || 'CNPJ/CPF'}</p>
            <p className="text-sm">{selectedCliente?.endereco_rua || 'Endereço Completo'}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] uppercase text-muted-foreground">Veículo</p>
            <p className="font-bold">{selectedVeiculo?.placa_cavalo || 'PLACA'}</p>
            <p className="text-sm">{selectedVeiculo?.modelo_cavalo || 'MODELO'}</p>
            <p className="text-sm">KM: {osData.km_entrada}</p>
          </div>
        </div>

        <div className="border border-navy overflow-hidden mb-6">
          <table className="w-full text-xs table-fixed">
            <thead className="bg-navy/5 text-navy border-b border-navy">
              <tr>
                <th className="text-left p-3 border-r border-navy font-bold uppercase tracking-wider w-[60%]">Descrição do Serviço / Peça</th>
                <th className="text-right p-3 border-r border-navy font-bold uppercase tracking-wider w-[10%]">Qtd</th>
                <th className="text-right p-3 border-r border-navy font-bold uppercase tracking-wider w-[15%]">Unit (R$)</th>
                <th className="text-right p-3 font-bold uppercase tracking-wider w-[15%]">Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="h-8 border-b border-navy/20">
                  <td className="p-2 border-r border-navy/20"></td>
                  <td className="p-2 border-r border-navy/20"></td>
                  <td className="p-2 border-r border-navy/20"></td>
                  <td className="p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mt-auto pt-12">
          <div className="border-t border-navy/40 pt-2 text-center">Assinatura Responsável</div>
          <div className="border-t border-navy/40 pt-2 text-center">Assinatura Cliente</div>
        </div>
      </div>

      {/* Workflow UI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 print:hidden">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1 rounded transition-all ${s <= step ? 'bg-orange' : 'bg-muted'}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 print:hidden">
        <div className="md:col-span-2 lg:col-span-3 space-y-6">
          {step === 1 && (
            <Card className="card-system group">
              <CardHeader className="bg-muted/30 border-b border-border py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <UserPlus className="w-3.5 h-3.5 text-orange" />
                  1. Identificação do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex gap-3">
                  <Input 
                    placeholder="CNPJ ou Nome..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 focus-visible:ring-primary/20 text-[11px] placeholder:text-muted-foreground/40 rounded"
                  />
                  <Button onClick={handleSearch} className="h-9 px-6 bg-primary text-white hover:bg-primary/90 font-semibold text-[10px] uppercase tracking-wider rounded">
                    Buscar
                  </Button>
                </div>
                <div className="p-6 border border-dashed border-border rounded flex flex-col items-center justify-center text-center bg-muted/5 group hover:bg-muted/10 transition-colors">
                  <UserPlus className="w-10 h-10 mb-4 opacity-20 text-primary group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest max-w-xs">Cliente não encontrado localmente ou na Omie?</p>
                  <Button variant="outline" size="sm" className="mt-4 h-8 px-5 rounded border-primary/20 text-primary hover:bg-primary/5 text-[9px] font-semibold uppercase tracking-wider transition-all">
                    Novo Cadastro Manual
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="card-system group">
              <CardHeader className="bg-navy text-white p-3">
                <CardTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-cyan" />
                  2. Veículo do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mock veículos para o protótipo UI */}
                  <div 
                    onClick={() => { setSelectedVeiculo({id: '1', placa_cavalo: 'ABC-1234'}); setStep(3); }}
                    className="p-3 border border-border hover:border-orange rounded cursor-pointer transition-all group bg-muted/5 hover:bg-white"
                  >
                    <p className="text-[8px] uppercase font-semibold text-muted-foreground/60 group-hover:text-orange">Placa</p>
                    <p className="text-xl font-mono font-semibold text-navy">ABC-1234</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Scania R450 - Azul</p>
                  </div>
                  <div className="p-3 border border-dashed border-border hover:border-orange rounded cursor-pointer flex flex-col items-center justify-center text-center group bg-muted/5">
                    <Plus className="w-6 h-6 text-navy/20 group-hover:text-orange mb-1.5" />
                    <p className="text-[9px] font-semibold text-navy/40 uppercase tracking-wider group-hover:text-orange">Novo Veículo</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/10 h-8">Voltar</Button>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="rounded-lg border-none shadow-sm shadow-navy/5 bg-white overflow-hidden">
              <CardHeader className="bg-navy text-white">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan" />
                  Detalhes da Entrada
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy">Box da Oficina</label>
                    <Input 
                      placeholder="Ex: Box 04" 
                      value={osData.box}
                      onChange={(e) => setOsData({...osData, box: e.target.value})}
                      className="rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-navy">KM de Entrada</label>
                    <Input 
                      type="number"
                      placeholder="000.000" 
                      value={osData.km_entrada}
                      onChange={(e) => setOsData({...osData, km_entrada: Number(e.target.value)})}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-navy">Nome do Motorista</label>
                  <Input 
                    placeholder="Quem trouxe o veículo?" 
                    value={osData.motorista_cliente}
                    onChange={(e) => setOsData({...osData, motorista_cliente: e.target.value})}
                    className="rounded-md"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button onClick={() => setStep(4)} className="bg-orange hover:bg-orange/90 rounded-sm px-8">Próximo</Button>
                  <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground">Voltar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="rounded-lg border-none shadow-sm shadow-navy/5 bg-white overflow-hidden">
              <CardHeader className="bg-navy text-white">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-cyan" />
                  Fotos e Finalização
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square bg-navy/5 border-2 border-dashed border-navy/10 rounded-md flex flex-col items-center justify-center text-muted-foreground group hover:border-orange cursor-pointer">
                      <Camera className="w-6 h-6 mb-2 opacity-20 group-hover:text-orange" />
                      <span className="text-[10px] uppercase font-bold">Foto {i}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-navy">Observações Gerais</label>
                  <textarea 
                    className="w-full min-h-[100px] p-4 rounded-md border border-navy/10 focus:ring-2 focus:ring-orange outline-none"
                    placeholder="Problemas relatados pelo cliente..."
                    value={osData.observacoes_gerais}
                    onChange={(e) => setOsData({...osData, observacoes_gerais: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white rounded-sm px-8 flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Abrir e Imprimir OS
                  </Button>
                  <Button variant="ghost" onClick={() => setStep(3)} className="text-muted-foreground">Voltar</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 print:hidden">
          <Card className="card-system">
            <CardHeader className="bg-muted/30 border-b border-border py-3 px-4">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-primary">Resumo da OS</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-[9px] uppercase font-semibold text-muted-foreground/60 tracking-wider">Status</div>
                <div className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider">Nova OS</div>
              </div>
              
              {selectedCliente && (
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground/60 tracking-wider">Cliente</div>
                  <div className="text-[13px] font-semibold text-primary">{selectedCliente.nome}</div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{selectedCliente.documento}</div>
                </div>
              )}

              {selectedVeiculo && (
                <div className="space-y-1 border-t border-border/50 pt-4">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground/60 tracking-wider">Veículo</div>
                  <div className="text-[13px] font-semibold text-primary uppercase">{selectedVeiculo.placa_cavalo}</div>
                </div>
              )}

              {osData.box && (
                <div className="flex justify-between items-center border-t border-border/50 pt-4">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground/60 tracking-wider">Box</div>
                  <div className="text-[13px] font-semibold text-primary uppercase">{osData.box}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>

      <TabsContent value="clientes">
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-border pb-6">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-primary uppercase tracking-tight">Base de Clientes</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] opacity-60">Sincronizado com Omie ERP</p>
            </div>
            <Button variant="outline" className="text-[10px] font-bold uppercase tracking-wider gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Agora
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-3 card-system">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input placeholder="Pesquisar por nome, documento ou código Omie..." className="pl-10 h-10 text-xs" />
                </div>
                <div className="mt-6 border border-border rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 border-b border-border text-muted-foreground uppercase font-bold tracking-wider">
                      <tr>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Documento</th>
                        <th className="p-3">Código Omie</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-muted/5">
                        <td className="p-3 font-semibold">TRANSPORTADORA EXEMPLO LTDA</td>
                        <td className="p-3">00.000.000/0001-00</td>
                        <td className="p-3 font-mono text-cyan">1234567</td>
                        <td className="p-3"><span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase">Ativo</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-system h-fit">
              <CardHeader className="bg-muted/30 py-3 px-4 border-b border-border">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <UsersIcon className="w-3.5 h-3.5 text-orange" /> Métricas Base
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Total Local</p>
                  <p className="text-2xl font-bold text-navy">1.248</p>
                </div>
                <div className="space-y-1 border-t border-border/50 pt-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Pendentes Sinc</p>
                  <p className="text-2xl font-bold text-orange">0</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
      </Tabs>
    </div>
  );
}
