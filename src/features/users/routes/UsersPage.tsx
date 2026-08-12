// ============= Full file contents =============

import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { listUsersFn, transitionUserRoleFn } from '../lib/users.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, ShieldAlert, Power, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { InviteUserForm } from '../components/InviteUserForm';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
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
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div className="flex justify-between items-center border-b border-border/50 pb-8">
        <div>
          <h1 className="text-2xl font-black font-heading text-navy uppercase tracking-tighter flex items-center gap-3">
            <Users className="w-6 h-6 text-orange" />
            GESTÃO DE EQUIPE
          </h1>
          <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-[0.2em] opacity-70">Controle de acessos e cadastro de colaboradores</p>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-navy hover:bg-navy/80 text-white rounded-md text-[11px] font-black uppercase tracking-[0.2em] h-11 px-6 shadow-lg shadow-navy/20 gap-2">
              <UserPlus className="w-4 h-4" />
              CONVIDAR COLABORADOR
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-lg p-8">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-navy mb-4">Novo Convite de Acesso</DialogTitle>
            </DialogHeader>
            <InviteUserForm onSuccess={() => setIsInviteOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-lg border-border/50 shadow-sm overflow-hidden">
        <Table className="table-system">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic font-black uppercase tracking-widest text-xs">
                  Carregando registros...
                </TableCell>
              </TableRow>
            ) : users?.map((user: any) => (
              <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-4">
                    {user.foto ? (
                      <img src={user.foto} className="w-10 h-10 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center border border-border">
                        <UserCircle className="w-5 h-5 text-navy/30" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-navy uppercase tracking-tight">{user.nome || 'Sem nome'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-[11px] font-bold text-navy uppercase">{user.cargo}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">MAT: {user.matricula}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white border-primary/20 text-primary">
                    {user.role?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", user.status === 'ativo' ? "bg-green-500" : "bg-orange")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{user.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                   <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-md text-muted-foreground hover:text-navy border border-transparent hover:border-navy/10">
                        <ShieldAlert className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-md text-muted-foreground hover:text-red-600 border border-transparent hover:border-red-100">
                        <Power className="w-4 h-4" />
                      </Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
