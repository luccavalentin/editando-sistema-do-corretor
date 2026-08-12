import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getReportsData } from '@/features/os/services/os.functions';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Filter } from 'lucide-react';

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
});

function ReportsPage() {
  const fetchReports = useServerFn(getReportsData);
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchReports({ data: { period: 'all' } })
  });

  const exportToCSV = () => {
    if (!reports || reports.length === 0) return;
    
    const headers = ['ID', 'Protocolo', 'Cliente', 'Status', 'Valor Peças', 'Valor Serviço', 'Criado Em'];
    const rows = (reports as any[]).map((os: any) => [
      os.id,
      os.protocolo,
      os.cliente?.nome,
      os.status,
      os.valor_pecas,
      os.valor_servico,
      os.criado_em
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((v: any) => `"${v || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_os_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="p-5">Carregando relatórios...</div>;

  return (
    <div className="p-8 space-y-10 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center shadow-lg shadow-navy/20">
              <Download className="w-5 h-5 text-cyan" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
              Analytics Operacional
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">
            Consolidado Financeiro e Indicadores de Produtividade
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-10 px-6 rounded border-border hover:bg-muted font-bold text-[11px] uppercase tracking-widest transition-all">
            <Filter className="w-4 h-4 mr-2.5" />
            Filtrar Período
          </Button>
          <Button 
            onClick={exportToCSV} 
            className="h-10 px-8 bg-navy hover:bg-navy/90 text-white rounded shadow-xl shadow-navy/20 gap-3 transition-all text-[11px] font-bold uppercase tracking-widest"
          >
            <Download className="w-4 h-4 text-cyan" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Volume Total" value={reports?.length || 0} icon={Download} color="text-navy" />
        <StatCard 
          title="Ticket Médio" 
          value={`R$ ${(reports?.reduce((acc: number, curr: any) => acc + (Number(curr.valor_servico) || 0), 0) / (reports?.length || 1)).toFixed(0)}`} 
          icon={Download} 
          color="text-cyan" 
        />
        <StatCard 
          title="OS Concluídas" 
          value={reports?.filter((os: any) => os.status === 'concluida').length || 0} 
          icon={Download} 
          color="text-emerald-500" 
        />
      </div>

      <Card className="card-system overflow-hidden">
        <div className="bg-muted/30 border-b border-border py-5 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-navy/5">
              <TrendingUp className="w-4 h-4 text-navy" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Detalhamento Operacional por Protocolo
            </h3>
          </div>
        </div>
        <Table className="table-system">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-8">Protocolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Peças</TableHead>
              <TableHead className="text-right">Serviço</TableHead>
              <TableHead className="text-right pr-8">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports?.map((os: any) => (
              <TableRow key={os.id} className="interactive-item">
                <TableCell className="pl-8">
                  <span className="font-mono text-[11px] font-black text-navy tracking-wider uppercase">
                    {os.protocolo}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-primary uppercase tracking-tight">{os.cliente?.nome}</span>
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Tecnoar Cliente</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border border-navy/10 bg-navy/5 text-navy">
                    {os.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-right font-black tabular-nums text-primary/80">
                  R$ {os.valor_pecas?.toLocaleString() || '0,00'}
                </TableCell>
                <TableCell className="text-right font-black tabular-nums text-navy">
                  R$ {os.valor_servico?.toLocaleString() || '0,00'}
                </TableCell>
                <TableCell className="text-right pr-8">
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-60">
                    {new Date(os.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {(!reports || reports.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                      <Filter className="w-4 h-4 text-muted-foreground/20" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/20 tracking-[0.2em]">Sem registros</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>

  );
}
