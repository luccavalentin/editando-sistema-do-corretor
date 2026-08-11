import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { listUsersFn, transitionUserRoleFn } from '../lib/users.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, ShieldAlert, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const { data: users, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsersFn(),
  });

  const handleRoleChange = async (userId: string, newRole: 'superadmin' | 'admin_adm' | 'mecanico' | 'montador' | 'vendedor' | 'financeiro' | 'lider') => {
    try {
      await transitionUserRoleFn({ data: { targetUserId: userId, newRole } });
      toast.success('Role alterada com sucesso.');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className='p-8 space-y-8'>
      <div className="flex justify-between items-center">
        <h1 className='text-3xl font-bold text-navy flex items-center gap-3'>
          <Users className="w-8 h-8 text-orange" />
          Gestão de Usuários
        </h1>
        <Button className="bg-navy rounded-xl gap-2">
          <UserPlus className="w-4 h-4" />
          Convidar Usuário
        </Button>
      </div>

      <Card className="rounded-2xl border-none shadow-md shadow-navy/5 bg-white">
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome || user.email}</TableCell>
                  <TableCell>{user.cargo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ativo' ? 'default' : 'secondary'}>{user.status}</Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRoleChange(user.id, 'admin_adm')}>
                      <ShieldAlert className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Power className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}