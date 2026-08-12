import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistDiarioResponse {
  item_id: string;
  ok_abertura?: boolean;
  ok_fechamento?: boolean;
  observacao: string;
}

interface ChecklistDiarioItemProps {
  label: string;
  itemId: string;
  value?: ChecklistDiarioResponse;
  onChange: (res: ChecklistDiarioResponse) => void;
  tipo?: 'abertura' | 'fechamento' | 'dual';
}

export function ChecklistDiarioItem({ label, itemId, value, onChange, tipo = 'dual' }: ChecklistDiarioItemProps) {
  const updateStatus = (field: 'ok_abertura' | 'ok_fechamento', currentVal?: boolean) => {
    const nextVal = currentVal === undefined ? true : !currentVal;
    
    onChange({
      item_id: itemId,
      ok_abertura: field === 'ok_abertura' ? nextVal : (value?.ok_abertura ?? false),
      ok_fechamento: field === 'ok_fechamento' ? nextVal : (value?.ok_fechamento ?? false),
      observacao: value?.observacao || ''
    });
  };

  const showAbertura = tipo === 'dual' || tipo === 'abertura';
  const showFechamento = tipo === 'dual' || tipo === 'fechamento';

  return (
    <div className="p-2 border border-border rounded bg-card hover:border-border/80 transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-[10px] uppercase tracking-wider text-navy opacity-80">{label}</span>
        <div className="flex gap-2 shrink-0">
          {showAbertura && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[7px] font-medium text-muted-foreground uppercase opacity-40">AB</span>
              <button
                type="button"
                className={cn(
                  "w-8 h-7 flex items-center justify-center rounded border transition-all cursor-pointer",
                  value?.ok_abertura 
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm" 
                    : "bg-muted/30 text-muted-foreground/30 border-border hover:bg-muted/50 hover:text-muted-foreground/60"
                )}
                onClick={() => updateStatus('ok_abertura', value?.ok_abertura)}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {showFechamento && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[7px] font-medium text-muted-foreground uppercase opacity-40">FC</span>
              <button
                type="button"
                className={cn(
                  "w-8 h-7 flex items-center justify-center rounded border transition-all cursor-pointer",
                  value?.ok_fechamento 
                    ? "bg-navy text-white border-navy shadow-sm" 
                    : "bg-muted/30 text-muted-foreground/30 border-border hover:bg-muted/50 hover:text-muted-foreground/60"
                )}
                onClick={() => updateStatus('ok_fechamento', value?.ok_fechamento)}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        <Textarea
          placeholder="Ocorrências..."
          value={value?.observacao || ''}
          onChange={(e) => onChange({ 
            item_id: itemId, 
            ok_abertura: value?.ok_abertura ?? false,
            ok_fechamento: value?.ok_fechamento ?? false,
            observacao: e.target.value 
          })}
          className="rounded text-[10px] min-h-[36px] border-border bg-background focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30 py-1 px-2"
        />
      </div>
    </div>
  );
}