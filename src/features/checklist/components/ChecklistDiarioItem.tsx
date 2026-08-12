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
    <div className="p-3 border border-border rounded-sm bg-card hover:border-border/80 transition-all">
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-[11px] uppercase tracking-wider text-navy opacity-80">{label}</span>
        <div className="flex gap-2 shrink-0">
          {showAbertura && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">AB</span>
              <button
                type="button"
                className={cn(
                  "w-10 h-8 flex items-center justify-center rounded-sm border transition-all cursor-pointer",
                  value?.ok_abertura 
                    ? "bg-green-600 text-white border-green-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" 
                    : "bg-muted/30 text-muted-foreground/40 border-border hover:bg-muted/50"
                )}
                onClick={() => updateStatus('ok_abertura', value?.ok_abertura)}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {showFechamento && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">FC</span>
              <button
                type="button"
                className={cn(
                  "w-10 h-8 flex items-center justify-center rounded-sm border transition-all cursor-pointer",
                  value?.ok_fechamento 
                    ? "bg-navy text-white border-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" 
                    : "bg-muted/30 text-muted-foreground/40 border-border hover:bg-muted/50"
                )}
                onClick={() => updateStatus('ok_fechamento', value?.ok_fechamento)}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Textarea
          placeholder="Ocorrências / Observações..."
          value={value?.observacao || ''}
          onChange={(e) => onChange({ 
            item_id: itemId, 
            ok_abertura: value?.ok_abertura ?? false,
            ok_fechamento: value?.ok_fechamento ?? false,
            observacao: e.target.value 
          })}
          className="rounded-sm text-[11px] min-h-[40px] border-border bg-background focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30"
        />
      </div>
    </div>
  );
}