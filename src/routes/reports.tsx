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
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold font-heading text-primary uppercase tracking-tight">Relatórios e Analytics</h1>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-widest opacity-80">Consolidado de ordens de serviço e indicadores financeiros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-md border-border hover:bg-muted/50 text-[11px] font-medium uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 mr-2" /> Filtrar
          </Button>
          <Button onClick={exportToCSV} size="sm" className="h-9 px-5 bg-primary text-white hover:bg-primary/90 rounded-md text-[11px] font-semibold uppercase tracking-wider">
            <Download className="w-3.5 h-3.5 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="elevation-1 bg-card">
          <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Volume Total</CardTitle>
          </CardHeader>
          <CardContent className="py-6 px-5">
            <p className="text-3xl font-semibold text-primary tracking-tight tabular-nums">{reports?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="elevation-1 bg-card">
          <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio (Serv)</CardTitle>
          </CardHeader>
          <CardContent className="py-6 px-5">
            <p className="text-3xl font-semibold text-primary tracking-tight tabular-nums">
              R$ {(reports?.reduce((acc: number, curr: any) => acc + (Number(curr.valor_servico) || 0), 0) / (reports?.length || 1)).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="elevation-1 bg-card">
          <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">OS Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="py-6 px-5">
            <p className="text-3xl font-semibold text-primary tracking-tight tabular-nums">{reports?.filter((os: any) => os.status === 'concluida').length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card elevation-1 rounded-md overflow-hidden">
        <Table className="table-system">
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Vlr Peças</TableHead>
              <TableHead className="text-right">Vlr Serviço</TableHead>
              <TableHead className="text-right pr-6">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports?.map((os: any) => (
              <TableRow key={os.id} className="interactive-item">
                <TableCell className="pl-8 font-mono text-[11px] font-semibold text-primary">{os.protocolo}</TableCell>
                <TableCell className="font-semibold text-primary uppercase tracking-tight">{os.cliente?.nome}</TableCell>
                <TableCell>
                  <span className="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                    {os.status.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">R$ {os.valor_pecas?.toLocaleString() || '0,00'}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">R$ {os.valor_servico?.toLocaleString() || '0,00'}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground font-semibold uppercase text-right pr-8">
                  {new Date(os.criado_em).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {(!reports || reports.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/30 tracking-widest italic">Nenhum registro encontrado</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
