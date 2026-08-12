import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listUsersFn, transitionUserRoleFn } from '../lib/users.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, ShieldAlert, Power } from 'lucide-react';
import { toast } from 'sonner';
import { InviteUserForm } from '../components/InviteUserForm';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const { data: users, refetch, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsersFn(),
  });

  const handleRoleChange = async (userId: string, newRole: any) => {
    try {
      await transitionUserRoleFn({ data: { targetUserId: userId, newRole } });
      toast.success('Role alterada com sucesso.');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-end border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold font-heading text-navy uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            GESTÃO DE COLABORADORES
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Controle de acesso, roles e usuários do sistema</p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy hover:bg-navy/90 text-white rounded-sm text-[10px] font-bold uppercase tracking-widest h-8 px-4 shadow-xs gap-2">
              <UserPlus className="w-3.5 h-3.5" />
              CONVIDAR USUÁRIO
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold uppercase tracking-widest text-navy">NOVO CONVITE DE ACESSO</DialogTitle>
            </DialogHeader>
            <InviteUserForm onSuccess={() => setIsInviteOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-sm border border-border shadow-xs bg-card overflow-hidden">
        <CardContent className="p-0">
          <Table className="table-system">
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo / Matrícula</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/30 animate-pulse tracking-widest">Carregando usuários...</span>
                  </TableCell>
                </TableRow>
              ) : users?.map((user: any) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.foto ? (
                        <img src={user.foto} className="w-8 h-8 rounded-sm object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center border border-border">
                          <Users className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-navy uppercase">{user.nome || user.email.split('@')[0]}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-[10px] font-bold text-navy/70 uppercase tracking-tight">{user.cargo || 'Não definido'}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">#{user.matricula || '---'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-bold uppercase tracking-tighter rounded-xs px-2",
                      user.role === 'superadmin' ? "border-orange text-orange" : "border-navy/20 text-navy/60"
                    )}>
                      {user.role?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        user.status === 'ativo' ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">{user.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-xs text-muted-foreground hover:text-navy hover:bg-navy/5 border border-transparent hover:border-navy/10">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200">
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/30 tracking-widest italic">Nenhum colaborador encontrado</span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
