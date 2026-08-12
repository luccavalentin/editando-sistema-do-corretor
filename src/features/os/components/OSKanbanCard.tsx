import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, User, ArrowRight } from "lucide-react";
import { OrdemServico, OSStatus } from "../types/os.types";

interface OSKanbanCardProps {
  os: OrdemServico;
  onNextStatus: (osId: string, nextStatus: OSStatus) => void;
  nextStatus?: OSStatus;
}

export function OSKanbanCard({ os, onNextStatus, nextStatus }: OSKanbanCardProps) {
  return (
    <Card className="rounded-sm border border-border shadow-xs bg-card group hover:border-primary/30 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <span className="text-xs font-mono font-bold text-navy/60">{os.protocolo}</span>
          <Clock className="w-3 h-3 text-muted-foreground" />
        </div>
        
        <div>
          <p className="text-sm font-bold text-navy line-clamp-1">{os.cliente?.nome}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">
            {os.veiculo?.placa_cavalo} • {os.veiculo?.modelo_cavalo}
          </p>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-sm bg-muted flex items-center justify-center border border-border">
              <User className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">
              {os.tecnico?.nome?.split(' ')[0] || 'S/T'}
            </span>
          </div>
          {nextStatus && (
            <Button 
              size="sm" 
              variant="ghost"
              className="h-6 px-2 rounded-xs text-[9px] font-bold uppercase text-primary hover:bg-primary/5 gap-1 border border-transparent hover:border-primary/20"
              onClick={() => onNextStatus(os.id, nextStatus)}
            >
              PRÓXIMA
              <ArrowRight className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
