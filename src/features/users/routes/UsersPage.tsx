import React from 'react';
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

  return React.createElement('div', { className: 'p-5 space-y-5' },
    React.createElement('div', { className: 'flex justify-between items-center' },
      React.createElement('h1', { className: 'text-xl font-bold text-navy flex items-center gap-3' },
        React.createElement(Users, { className: 'w-8 h-8 text-orange' }),
        'Gestão de Usuários'
      ),
      React.createElement(Button, { className: 'bg-navy rounded-md gap-2' },
        React.createElement(UserPlus, { className: 'w-4 h-4' }),
        'Convidar Usuário'
      )
    ),
    React.createElement(Card, { className: 'rounded-md border-none shadow-xs shadow-navy/5 bg-white' },
      React.createElement(CardHeader, null,
        React.createElement(CardTitle, null, 'Usuários Cadastrados')
      ),
      React.createElement(CardContent, null,
        React.createElement(Table, null,
          React.createElement(TableHeader, null,
            React.createElement(TableRow, null,
              React.createElement(TableHead, null, 'Nome'),
              React.createElement(TableHead, null, 'Cargo'),
              React.createElement(TableHead, null, 'Role'),
              React.createElement(TableHead, null, 'Status'),
              React.createElement(TableHead, null, 'Ações')
            )
          ),
          React.createElement(TableBody, null,
            users?.map((user: any) => 
              React.createElement(TableRow, { key: user.id },
                React.createElement(TableCell, { className: 'font-medium' }, user.nome || user.email),
                React.createElement(TableCell, null, user.cargo),
                React.createElement(TableCell, null, React.createElement(Badge, { variant: 'outline' }, user.role)),
                React.createElement(TableCell, null, React.createElement(Badge, { variant: user.status === 'ativo' ? 'default' : 'secondary' }, user.status)),
                React.createElement(TableCell, { className: 'flex gap-2' },
                  React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: () => handleRoleChange(user.id, 'admin_adm') },
                    React.createElement(ShieldAlert, { className: 'w-4 h-4' })
                  ),
                  React.createElement(Button, { variant: 'ghost', size: 'sm' },
                    React.createElement(Power, { className: 'w-4 h-4' })
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}