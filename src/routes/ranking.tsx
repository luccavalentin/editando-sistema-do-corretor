import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getRanking } from '@/features/os/services/os.functions';
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
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="flex justify-between items-center border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold font-heading text-primary uppercase tracking-tight">
            Elite Tecnoar
          </h1>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-widest opacity-80">
            Performance Técnica e Reconhecimento Profissional
          </p>
        </div>
        <div className="flex bg-muted/30 p-1 border border-border rounded-md h-10">
          <button className="px-5 py-1 rounded bg-card shadow-sm text-[11px] font-semibold text-primary uppercase tracking-wider transition-all">Geral</button>
          <button className="px-5 py-1 text-[11px] font-medium text-muted-foreground hover:text-primary uppercase tracking-wider transition-all">Mensal</button>
          <button className="px-5 py-1 text-[11px] font-medium text-muted-foreground hover:text-primary uppercase tracking-wider transition-all">Semanal</button>
        </div>
      </div>

      {/* Pódio */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 py-12">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">2º LUGAR</p>
              <p className="font-bold text-navy uppercase">{topThree[1].email.split('@')[0]}</p>
              <p className="text-xl font-semibold text-primary tabular-nums tracking-tight">{topThree[1].points} PTS</p>
            </div>
            <div className="w-32 h-32 bg-muted/30 border-x border-t border-border rounded-t-sm flex items-start justify-center pt-4 relative">
              <div className="bg-card border border-border rounded-sm p-2 shadow-xs">
                <Medal className="w-8 h-8 text-slate-400" />
              </div>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold text-orange uppercase tracking-[0.2em] mb-1">CAMPEÃO</p>
              <p className="text-lg font-bold text-navy uppercase">{topThree[0].email.split('@')[0]}</p>
              <p className="text-2xl font-semibold text-primary tabular-nums tracking-tight">{topThree[0].points} PTS</p>
            </div>
            <div className="w-40 h-44 bg-navy/5 border-x border-t border-navy/20 rounded-t-sm flex items-start justify-center pt-6 relative">
              <div className="bg-card border border-navy/20 rounded-sm p-3 shadow-md">
                <Trophy className="w-12 h-12 text-yellow-500" />
              </div>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">3º LUGAR</p>
              <p className="font-bold text-navy uppercase">{topThree[2].email.split('@')[0]}</p>
              <p className="text-xl font-semibold text-primary tabular-nums tracking-tight">{topThree[2].points} PTS</p>
            </div>
            <div className="w-32 h-24 bg-muted/30 border-x border-t border-border rounded-t-sm flex items-start justify-center pt-4 relative">
              <div className="bg-card border border-border rounded-sm p-2 shadow-xs">
                <Medal className="w-8 h-8 text-amber-700" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabela de Classificação */}
      <Card className="elevation-1 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-widest text-primary flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Classificação Geral
            </CardTitle>
            <Star className="w-4 h-4 text-orange fill-orange/20" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-system">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] pl-8">Posição</TableHead>
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
                  <TableRow key={user.id} className="interactive-item group">
                    <TableCell className="pl-8 font-semibold text-primary">{index + 1}º</TableCell>
                    <TableCell className="font-semibold text-primary uppercase tracking-tight">{user.email?.split('@')[0] || 'Técnico'}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-orange tabular-nums">{user.points}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${level.color} border-current/20 bg-current/5`}>
                        {level.label}
                      </span>
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <div className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
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
