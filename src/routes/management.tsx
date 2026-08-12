import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { searchClienteLocal, openOS, getVeiculosByCliente } from '@/integrations/management.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, UserPlus, Truck, Plus, Printer, Camera } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/management')({
  component: ManagementPage,
});

function ManagementPage() {
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
    <div className="p-5 max-w-5xl mx-auto space-y-5 print:p-0">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-xl font-bold font-heading text-navy">Gestão de OS</h1>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-navy/5 px-4 py-2 rounded-sm text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Léo (Admin ADM)
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

        <div className="border border-navy/20 rounded-lg overflow-hidden mb-5">
          <table className="w-full text-sm">
            <thead className="bg-navy/5">
              <tr>
                <th className="text-left p-2 border-b border-navy/20">Descrição do Serviço</th>
                <th className="text-right p-2 border-b border-navy/20">Qtd</th>
                <th className="text-right p-2 border-b border-navy/20">Unit</th>
                <th className="text-right p-2 border-b border-navy/20">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b border-navy/10 italic text-muted-foreground">Nenhum serviço registrado ainda</td>
                <td className="p-2 border-b border-navy/10 text-right">-</td>
                <td className="p-2 border-b border-navy/10 text-right">-</td>
                <td className="p-2 border-b border-navy/10 text-right">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mt-auto pt-12">
          <div className="border-t border-navy/40 pt-2 text-center">Assinatura Responsável</div>
          <div className="border-t border-navy/40 pt-2 text-center">Assinatura Cliente</div>
        </div>
      </div>

      {/* Workflow UI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 rounded-sm transition-all ${s <= step ? 'bg-orange' : 'bg-navy/10'}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="md:col-span-2 space-y-4">
          {step === 1 && (
            <Card className="rounded-lg border-none shadow-sm shadow-navy/5 bg-white overflow-hidden">
              <CardHeader className="bg-navy text-white">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan" />
                  Identificação do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Buscar por CNPJ ou Nome..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-md h-12 border-navy/10 focus:ring-orange"
                  />
                  <Button onClick={handleSearch} className="h-12 w-12 rounded-md bg-navy hover:bg-navy/90">
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
                <div className="p-5 border-2 border-dashed border-navy/10 rounded-md flex flex-col items-center justify-center text-center text-muted-foreground">
                  <UserPlus className="w-12 h-12 mb-4 opacity-20 text-navy" />
                  <p>Ou cadastre um novo cliente se não existir local ou na Omie.</p>
                  <Button variant="outline" className="mt-4 rounded-sm border-orange text-orange hover:bg-orange/5">
                    Novo Cadastro Manual
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="rounded-lg border-none shadow-sm shadow-navy/5 bg-white overflow-hidden">
              <CardHeader className="bg-navy text-white">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan" />
                  Veículo do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mock veículos para o protótipo UI */}
                  <div 
                    onClick={() => { setSelectedVeiculo({id: '1', placa_cavalo: 'ABC-1234'}); setStep(3); }}
                    className="p-4 border-2 border-navy/5 hover:border-orange rounded-md cursor-pointer transition-all group"
                  >
                    <p className="text-[10px] uppercase font-bold text-muted-foreground group-hover:text-orange">Placa</p>
                    <p className="text-2xl font-mono font-bold text-navy">ABC-1234</p>
                    <p className="text-sm text-muted-foreground">Scania R450 - Azul</p>
                  </div>
                  <div className="p-4 border-2 border-dashed border-navy/10 hover:border-orange rounded-md cursor-pointer flex flex-col items-center justify-center text-center group">
                    <Plus className="w-8 h-8 text-navy/20 group-hover:text-orange mb-2" />
                    <p className="text-sm font-medium text-navy/40 group-hover:text-orange">Novo Veículo</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground">Voltar</Button>
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
          <Card className="rounded-lg border-none shadow-sm shadow-navy/5 bg-white overflow-hidden">
            <CardHeader className="bg-navy/5 border-b border-navy/5">
              <CardTitle className="text-lg font-heading text-navy">Resumo da OS</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="text-xs uppercase font-bold text-muted-foreground">Status</div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-sm text-[10px] font-bold uppercase">Nova OS</div>
              </div>
              
              {selectedCliente && (
                <div className="space-y-1">
                  <div className="text-xs uppercase font-bold text-muted-foreground">Cliente</div>
                  <div className="text-sm font-bold text-navy">{selectedCliente.nome}</div>
                  <div className="text-xs text-muted-foreground">{selectedCliente.documento}</div>
                </div>
              )}

              {selectedVeiculo && (
                <div className="space-y-1 border-t border-navy/5 pt-4">
                  <div className="text-xs uppercase font-bold text-muted-foreground">Veículo</div>
                  <div className="text-sm font-bold text-navy">{selectedVeiculo.placa_cavalo}</div>
                </div>
              )}

              {osData.box && (
                <div className="flex justify-between items-center border-t border-navy/5 pt-4">
                  <div className="text-xs uppercase font-bold text-muted-foreground">Box</div>
                  <div className="text-sm font-bold text-navy">{osData.box}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
