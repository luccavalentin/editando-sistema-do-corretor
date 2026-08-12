import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Minus, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistResponse {
  item_id: string;
  status: 'ok' | 'nao_ok' | 'nao_aplica';
  observacao: string;
  evidencias: string[];
}

interface ChecklistItemProps {
  label: string;
  itemId: string;
  value?: ChecklistResponse;
  onChange: (res: ChecklistResponse) => void;
}

export function ChecklistItem({ label, itemId, value, onChange }: ChecklistItemProps) {
  const status = value?.status;
  const showObs = status === 'nao_ok';

  const updateStatus = (newStatus: ChecklistResponse['status']) => {
    onChange({
      item_id: itemId,
      status: newStatus,
      observacao: value?.observacao || '',
      evidencias: value?.evidencias || []
    });
  };

  return (
    <div className="p-4 border border-border rounded-sm bg-card space-y-4 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <span className="font-bold text-xs uppercase tracking-wider text-navy">{label}</span>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant={status === 'ok' ? 'default' : 'outline'}
            className={cn(status === 'ok' ? "bg-green-600 text-white border-green-700" : "text-muted-foreground/40", "w-8 h-8 p-0 rounded-sm border border-border")}
            onClick={() => updateStatus('ok')}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={status === 'nao_ok' ? 'default' : 'outline'}
            className={cn(status === 'nao_ok' ? "bg-red-600 text-white border-red-700" : "text-muted-foreground/40", "w-8 h-8 p-0 rounded-sm border border-border")}
            onClick={() => updateStatus('nao_ok')}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={status === 'nao_aplica' ? 'default' : 'outline'}
            className={cn(status === 'nao_aplica' ? "bg-navy text-white border-navy/90" : "text-muted-foreground/40", "w-8 h-8 p-0 rounded-sm border border-border")}
            onClick={() => updateStatus('nao_aplica')}
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {(showObs || value?.observacao) && (
        <Textarea
          placeholder="Descreva detalhadamente o problema identificado..."
          value={value?.observacao || ''}
          onChange={(e) => onChange({ ...value!, item_id: itemId, status: status!, observacao: e.target.value })}
          className={cn("rounded-sm text-sm border-border bg-background focus:ring-1 focus:ring-red-500", showObs && !value?.observacao && "border-red-500")}
        />
      )}
      
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-widest h-8 border-border rounded-sm px-3 hover:bg-muted/50">
          <Camera className="w-3.5 h-3.5 mr-2 text-primary" />
          ADICIONAR EVIDÊNCIA
        </Button>
        {status === 'nao_ok' && !value?.observacao && (
          <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">
            * Observação Obrigatória
          </span>
        )}
      </div>
    </div>
  );
}
