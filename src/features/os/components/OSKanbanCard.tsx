import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, User, ArrowRight } from "lucide-react";
import { OrdemServico, OSStatus } from "../types/os.types";

interface OSKanbanCardProps {
  os: OrdemServico;
  onNextStatus: (osId: string, nextStatus: OSStatus) => void;
  nextStatus?: OSStatus | undefined;
}

export function OSKanbanCard({ os, onNextStatus, nextStatus }: OSKanbanCardProps) {
  return (
    <Card className="card-system interactive-item group">
      <CardContent className="p-3 space-y-3">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono font-medium tracking-wider text-muted-foreground/60 uppercase">{os.protocolo}</span>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground uppercase">
            <Clock className="w-3 h-3" />
            {new Date(os.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary leading-tight group-hover:text-orange transition-colors">{os.cliente?.nome}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-navy/5 text-[10px] font-semibold text-navy uppercase border border-navy/10">
              {os.veiculo?.placa_cavalo}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight self-center">
              {os.veiculo?.modelo_cavalo}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-medium text-muted-foreground/60 uppercase leading-none">Técnico</span>
              <span className="text-[10px] font-medium text-primary uppercase">
                {os.tecnico?.nome?.split(' ')[0] || 'A DEFINIR'}
              </span>
            </div>
          </div>
          {nextStatus && (
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 rounded border border-orange/10 text-[9px] font-semibold uppercase text-orange hover:bg-orange hover:text-white transition-all gap-1.5 shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                onNextStatus(os.id, nextStatus);
              }}
            >
              AVANÇAR
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
