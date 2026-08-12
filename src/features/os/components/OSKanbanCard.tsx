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
    <Card className="card-system group hover:elevation-2 transition-all duration-300">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-muted-foreground/70 uppercase">{os.protocolo}</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-[10px] font-bold text-muted-foreground uppercase">
            <Clock className="w-3 h-3" />
            {new Date(os.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-bold text-primary leading-tight group-hover:text-orange transition-colors">{os.cliente?.nome}</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-1.5 py-0.5 rounded bg-navy/5 text-[10px] font-bold text-navy uppercase tracking-tighter border border-navy/10">
              {os.veiculo?.placa_cavalo}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight self-center">
              {os.veiculo?.modelo_cavalo}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center border border-border shadow-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase leading-none">Técnico</span>
              <span className="text-[10px] font-bold text-primary uppercase">
                {os.tecnico?.nome?.split(' ')[0] || 'A DEFINIR'}
              </span>
            </div>
          </div>
          {nextStatus && (
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-3 rounded border-orange/20 text-[10px] font-bold uppercase text-orange hover:bg-orange hover:text-white hover:border-orange transition-all gap-1.5 active:scale-95 shadow-sm"
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

