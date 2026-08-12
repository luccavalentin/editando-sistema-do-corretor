import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getReportsData } from '@/integrations/management.functions';
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
    queryFn: () => fetchReports({ period: 'all' } as any)
  });


  const exportToCSV = () => {
    if (!reports || reports.length === 0) return;
    
    const headers = ['ID', 'Protocolo', 'Cliente', 'Status', 'Valor Peças', 'Valor Serviço', 'Criado Em'];
    const rows = reports.map(os => [
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
      ...rows.map(row => row.map(v => `"${v || ''}"`).join(','))
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
      <div className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold font-heading text-navy uppercase tracking-tight">RELATÓRIOS E ANALYTICS</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Consolidado de ordens de serviço e indicadores financeiros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-sm text-[10px] font-bold uppercase tracking-widest border-border hover:bg-muted/50">
            <Filter className="w-3.5 h-3.5" /> FILTRAR
          </Button>
          <Button onClick={exportToCSV} size="sm" className="bg-navy text-white hover:bg-navy/90 h-8 rounded-sm text-[10px] font-bold uppercase tracking-widest px-4">
            <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-sm border border-border shadow-xs bg-card">
          <CardHeader className="py-4 px-4 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Volume Total</CardTitle>
          </CardHeader>
          <CardContent className="py-6 px-4">
            <p className="text-2xl font-semibold text-navy tracking-tight tabular-nums">{reports?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-md border-navy/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Ticket Médio (Serviços)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-navy">
              R$ {(reports?.reduce((acc, curr) => acc + (Number(curr.valor_servico) || 0), 0) / (reports?.length || 1)).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-md border-navy/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan">{reports?.filter(os => os.status === 'concluida').length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-navy/10 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-navy/5">
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vlr Peças</TableHead>
              <TableHead>Vlr Serviço</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports?.map((os) => (
              <TableRow key={os.id}>
                <TableCell className="font-mono text-xs">{os.protocolo}</TableCell>
                <TableCell className="font-medium text-navy">{os.cliente?.nome}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-sm bg-navy/5 text-[10px] uppercase font-bold text-navy">
                    {os.status}
                  </span>
                </TableCell>
                <TableCell>R$ {os.valor_pecas || 0}</TableCell>
                <TableCell>R$ {os.valor_servico || 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(os.criado_em).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
