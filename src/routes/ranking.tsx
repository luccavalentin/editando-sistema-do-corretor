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
    <div className="p-8 space-y-10 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center shadow-lg shadow-navy/20">
              <Trophy className="w-5 h-5 text-cyan" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
              Elite Tecnoar
            </h1>
          </div>
          <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">
            Performance Técnica e Reconhecimento Profissional
          </p>
        </div>
        <div className="flex bg-muted p-1 border border-border rounded-lg h-10">
          <button className="px-6 py-1 rounded bg-card shadow-sm text-[11px] font-bold text-primary uppercase tracking-widest transition-all">Geral</button>
          <button className="px-6 py-1 text-[11px] font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-all">Mensal</button>
          <button className="px-6 py-1 text-[11px] font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-all">Semanal</button>
        </div>
      </div>

      {/* Pódio Industrial */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-0 py-16">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-6 px-4">
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] block mb-2">Vice-Líder</span>
              <p className="text-sm font-bold text-navy uppercase mb-1">{topThree[1].email.split('@')[0]}</p>
              <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">{topThree[1].points} <span className="text-[10px] font-bold opacity-40">PTS</span></p>
            </div>
            <div className="w-48 h-40 bg-muted/20 border-x border-t border-border rounded-tl-xl flex items-start justify-center pt-6 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              <div className="bg-card border border-border rounded-lg p-3 shadow-md">
                <Medal className="w-8 h-8 text-slate-400" />
              </div>
              <span className="absolute bottom-4 text-4xl font-black text-muted-foreground/10 select-none">2</span>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center z-10"
          >
            <div className="text-center mb-8 px-6">
              <span className="inline-block px-3 py-1 rounded-full bg-orange text-[9px] font-black text-white uppercase tracking-[0.4em] mb-3 shadow-lg shadow-orange/20 animate-pulse">
                Campeão
              </span>
              <p className="text-lg font-black text-navy uppercase mb-1 tracking-tight">{topThree[0].email.split('@')[0]}</p>
              <p className="text-4xl font-black text-primary tabular-nums tracking-tighter">{topThree[0].points} <span className="text-[12px] font-bold opacity-40">PTS</span></p>
            </div>
            <div className="w-56 h-64 bg-navy/5 border-x border-t border-navy/10 rounded-t-2xl flex items-start justify-center pt-8 relative shadow-2xl shadow-navy/5">
              <div className="bg-card border-2 border-orange/20 rounded-xl p-4 shadow-xl">
                <Trophy className="w-14 h-14 text-yellow-500" />
              </div>
              <span className="absolute bottom-6 text-7xl font-black text-navy/5 select-none">1</span>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-6 px-4">
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] block mb-2">3º Posição</span>
              <p className="text-sm font-bold text-navy uppercase mb-1">{topThree[2].email.split('@')[0]}</p>
              <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">{topThree[2].points} <span className="text-[10px] font-bold opacity-40">PTS</span></p>
            </div>
            <div className="w-48 h-32 bg-muted/20 border-x border-t border-border rounded-tr-xl flex items-start justify-center pt-6 relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              <div className="bg-card border border-border rounded-lg p-3 shadow-md">
                <Medal className="w-8 h-8 text-amber-700" />
              </div>
              <span className="absolute bottom-4 text-4xl font-black text-muted-foreground/10 select-none">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tabela de Classificação Profissional */}
      <Card className="card-system overflow-hidden">
        <div className="bg-muted/30 border-b border-border py-5 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-navy/5">
              <TrendingUp className="w-4 h-4 text-navy" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              Quadro Geral de Performance
            </h3>
          </div>
          <Star className="w-4 h-4 text-orange fill-orange animate-pulse" />
        </div>
        <Table className="table-system">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px] pl-8">Rank</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Pontuação</TableHead>
              <TableHead>Certificação</TableHead>
              <TableHead className="pr-8 text-right">Evolução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {ranking?.map((user, index) => {
              const level = getLevel(user.points);
              return (
                <TableRow key={user.id} className="interactive-item group">
                  <TableCell className="pl-8">
                    <span className={`text-[11px] font-black ${index < 3 ? 'text-orange' : 'text-primary/40'} tracking-tighter`}>
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary uppercase tracking-tight">{user.email?.split('@')[0] || 'Técnico Especialista'}</span>
                      <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Equipe Tecnoar</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-primary tabular-nums tracking-tighter text-base">{user.points}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${level.color} border-current/20 bg-current/5 shadow-sm`}>
                      Nível {level.label}
                    </span>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                      <TrendingUp className="w-3 h-3" />
                      +{(user.points * 0.1).toFixed(0)}%
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

