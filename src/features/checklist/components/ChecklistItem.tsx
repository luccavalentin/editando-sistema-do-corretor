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
    <div className="p-4 border rounded-md bg-card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <span className="font-medium text-sm sm:text-base">{label}</span>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant={status === 'ok' ? 'default' : 'outline'}
            className={cn(status === 'ok' && "bg-green-600 hover:bg-green-700", "w-10 h-10 p-0 rounded-full")}
            onClick={() => updateStatus('ok')}
          >
            <Check className="w-5 h-5" />
          </Button>
          <Button
            size="sm"
            variant={status === 'nao_ok' ? 'default' : 'outline'}
            className={cn(status === 'nao_ok' && "bg-red-600 hover:bg-red-700", "w-10 h-10 p-0 rounded-full")}
            onClick={() => updateStatus('nao_ok')}
          >
            <X className="w-5 h-5" />
          </Button>
          <Button
            size="sm"
            variant={status === 'nao_aplica' ? 'default' : 'outline'}
            className={cn("w-10 h-10 p-0 rounded-full")}
            onClick={() => updateStatus('nao_aplica')}
          >
            <Minus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {(showObs || value?.observacao) && (
        <Textarea
          placeholder="Descreva o problema identificado..."
          value={value?.observacao || ''}
          onChange={(e) => onChange({ ...value!, item_id: itemId, status: status!, observacao: e.target.value })}
          className={cn(showObs && !value?.observacao && "border-red-500")}
        />
      )}
      
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" className="text-xs h-8">
          <Camera className="w-4 h-4 mr-2" />
          Foto/Vídeo
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
