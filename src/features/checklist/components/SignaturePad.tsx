import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  label?: string;
}

export function SignaturePad({ onSave, label = "Assinatura Digital" }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => sigCanvas.current?.clear();
  
  const save = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const dataURL = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataURL) onSave(dataURL);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="border rounded-md bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: "w-full h-40 cursor-crosshair",
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Limpar
        </Button>
        <Button variant="default" size="sm" onClick={save} className="flex-1 bg-[#f06000] hover:bg-[#d05000]">
          <Check className="w-4 h-4 mr-2" />
          Confirmar
        </Button>
      </div>
    </Card>
  );
}
