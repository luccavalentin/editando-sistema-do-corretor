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
    <Card className="rounded-md elevation-1 bg-card group hover:elevation-2 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-mono font-medium text-muted-foreground">{os.protocolo}</span>
          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-primary line-clamp-1">{os.cliente?.nome}</p>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
            {os.veiculo?.placa_cavalo} • {os.veiculo?.modelo_cavalo}
          </p>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center border border-border">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {os.tecnico?.nome?.split(' ')[0] || 'S/T'}
            </span>
          </div>
          {nextStatus && (
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 px-3 rounded text-[10px] font-semibold uppercase text-primary hover:bg-accent gap-1.5"
              onClick={() => onNextStatus(os.id, nextStatus)}
            >
              PRÓXIMA
              <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
