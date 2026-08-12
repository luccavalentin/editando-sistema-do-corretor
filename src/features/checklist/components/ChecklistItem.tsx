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
    <div className="p-3 border border-border rounded-sm bg-card hover:border-border/80 transition-all">
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-[11px] uppercase tracking-wider text-navy opacity-80">{label}</span>
        <div className="flex gap-1 shrink-0">
          <button
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-sm border transition-all cursor-pointer",
              status === 'ok' 
                ? "bg-green-600 text-white border-green-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-muted/30 text-muted-foreground/40 border-border hover:bg-muted/50"
            )}
            onClick={() => updateStatus('ok')}
            title="OK"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-sm border transition-all cursor-pointer",
              status === 'nao_ok' 
                ? "bg-red-600 text-white border-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-muted/30 text-muted-foreground/40 border-border hover:bg-muted/50"
            )}
            onClick={() => updateStatus('nao_ok')}
            title="NÃO OK"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-sm border transition-all cursor-pointer",
              status === 'nao_aplica' 
                ? "bg-navy text-white border-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" 
                : "bg-muted/30 text-muted-foreground/40 border-border hover:bg-muted/50"
            )}
            onClick={() => updateStatus('nao_aplica')}
            title="NÃO SE APLICA"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(showObs || value?.observacao) && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="Descreva detalhadamente o problema identificado..."
            value={value?.observacao || ''}
            onChange={(e) => onChange({ ...value!, item_id: itemId, status: status!, observacao: e.target.value })}
            className={cn(
              "rounded-sm text-[11px] min-h-[60px] border-border bg-background focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30",
              showObs && !value?.observacao && "border-red-500/50 bg-red-500/[0.02]"
            )}
          />
          {showObs && !value?.observacao && (
            <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest px-1">
              * Observação Obrigatória para itens irregulares
            </p>
          )}
        </div>
      )}
      
      <div className="mt-3 flex gap-2 items-center border-t border-border/50 pt-2">
        <button 
          className="text-[9px] font-bold uppercase tracking-widest h-6 border border-border rounded-sm px-2 bg-muted/20 hover:bg-muted/40 text-muted-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          onClick={(e) => e.preventDefault()}
        >
          <Camera className="w-3 h-3 text-primary" />
          ANEXAR EVIDÊNCIA
        </button>
        {value?.evidencias && value.evidencias.length > 0 && (
          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
            {value.evidencias.length} ARQUIVOS
          </span>
        )}
      </div>
    </div>
  );
}
