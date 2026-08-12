import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { inviteUserFn } from '../lib/users.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function InviteUserForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const inviteFn = useServerFn(inviteUserFn);
  
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    cargo: '',
    matricula: '',
    role: 'mecanico' as const
  });

  const mutation = useMutation({
    mutationFn: (data: any) => inviteFn({ data }),
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onSuccess();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">E-mail</label>
        <Input 
          type="email" 
          required 
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="rounded-sm"
          placeholder="exemplo@tecnoarfreios.com.br"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome Completo</label>
          <Input 
            required 
            value={formData.nome}
            onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
            className="rounded-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Matrícula</label>
          <Input 
            required 
            value={formData.matricula}
            onChange={e => setFormData(prev => ({ ...prev, matricula: e.target.value }))}
            className="rounded-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cargo</label>
          <Input 
            required 
            value={formData.cargo}
            onChange={e => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
            className="rounded-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role do Sistema</label>
          <Select 
            value={formData.role} 
            onValueChange={(val: any) => setFormData(prev => ({ ...prev, role: val }))}
          >
            <SelectTrigger className="rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mecanico">Mecânico</SelectItem>
              <SelectItem value="montador">Montador</SelectItem>
              <SelectItem value="vendedor">Vendedor</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="lider">Líder de Setor</SelectItem>
              <SelectItem value="admin_adm">Admin Administrativo</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-navy text-white hover:bg-navy/90 rounded-sm font-bold uppercase tracking-widest text-[11px] h-10 mt-2"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        ENVIAR CONVITE
      </Button>
    </form>
  );
}
