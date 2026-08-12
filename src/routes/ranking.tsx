import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getRanking } from '@/integrations/management.functions';
import { useServerFn } from '@tanstack/react-start';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/ranking')({
  component: RankingPage,
});

function RankingPage() {
  const fetchRanking = useServerFn(getRanking);
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['ranking'],
    queryFn: () => fetchRanking({ period: 'all' } as any)
  });


  if (isLoading) return <div className="p-5">Carregando ranking...</div>;

  const topThree = ranking?.slice(0, 3) || [];
  const others = ranking?.slice(3) || [];

  const getMedal = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 1: return <Medal className="w-8 h-8 text-slate-400" />;
      case 2: return <Medal className="w-8 h-8 text-amber-700" />;
      default: return null;
    }
  };

  const getLevel = (points: number) => {
    if (points > 1000) return { label: 'Diamante', color: 'text-cyan' };
    if (points > 500) return { label: 'Ouro', color: 'text-yellow-600' };
    if (points > 200) return { label: 'Prata', color: 'text-slate-500' };
    return { label: 'Bronze', color: 'text-amber-800' };
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold font-heading text-navy uppercase tracking-tight text-primary">RANKING DE PERFORMANCE</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Indicadores de excelência e produtividade técnica</p>
        </div>
        <div className="flex bg-muted/50 p-1 border border-border rounded-sm h-10">
          <button className="px-4 py-1.5 rounded-xs bg-card shadow-xs text-[10px] font-bold text-navy uppercase tracking-wider border border-border">Geral</button>
          <button className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mensal</button>
          <button className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semanal</button>
        </div>
      </div>

      {/* Pódio */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 py-8">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-slate-300 flex items-center justify-center relative">
              <span className="text-2xl font-bold text-slate-400">2</span>
              <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-xs">
                {getMedal(1)}
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-navy">{topThree[1].email.split('@')[0]}</p>
              <p className="text-xl font-semibold text-orange">{topThree[1].points} pts</p>
            </div>
            <div className="w-32 h-24 bg-navy/5 rounded-t-3xl border-x border-t border-navy/10 flex items-end justify-center pb-2">
              <Medal className="w-6 h-6 text-slate-400" />
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-32 h-32 rounded-full bg-yellow-50 border-4 border-yellow-400 flex items-center justify-center relative">
              <span className="text-xl font-bold text-yellow-600">1</span>
              <div className="absolute -top-4 -right-2 bg-white rounded-full p-1 shadow-xs">
                {getMedal(0)}
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy">{topThree[0].email.split('@')[0]}</p>
              <p className="text-xl font-semibold text-orange">{topThree[0].points} pts</p>
            </div>
            <div className="w-40 h-32 bg-navy/10 rounded-t-3xl border-x border-t border-navy/20 flex items-end justify-center pb-4">
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-600 flex items-center justify-center relative">
              <span className="text-xl font-bold text-amber-700">3</span>
              <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-xs">
                {getMedal(2)}
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-navy">{topThree[2].email.split('@')[0]}</p>
              <p className="text-lg font-semibold text-orange">{topThree[2].points} pts</p>
            </div>
            <div className="w-28 h-16 bg-navy/5 rounded-t-3xl border-x border-t border-navy/10 flex items-end justify-center pb-2">
              <Medal className="w-6 h-6 text-amber-700" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabela de Classificação */}
      <Card className="rounded-sm border border-border shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-navy flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> CLASSIFICAÇÃO GERAL
            </CardTitle>
            <Star className="w-4 h-4 text-orange" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-system">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] pl-8">Posição</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Pontuação</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="pr-8 text-right">Desempenho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking?.map((user, index) => {
                const level = getLevel(user.points);
                return (
                  <TableRow key={user.id} className="hover:bg-navy/5 transition-colors">
                    <TableCell className="pl-8 font-semibold text-navy">{index + 1}º</TableCell>
                    <TableCell className="font-bold text-navy">{user.email.split('@')[0]}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-orange">{user.points}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-sm text-[10px] font-semibold uppercase border ${level.color} border-current`}>
                        {level.label}
                      </span>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="inline-flex items-center gap-1 text-green-600 font-bold text-xs">
                        <TrendingUp className="w-3 h-3" />
                        +{(user.points * 0.1).toFixed(0)}%
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
