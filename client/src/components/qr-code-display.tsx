import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Visitor } from "@shared/schema";

interface QRCodeDisplayProps {
  visitor: Visitor;
  open: boolean;
  onClose: () => void;
}

export default function QRCodeDisplay({ visitor, open, onClose }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    if (canvasRef.current && open) {
      QRCodeLib.toCanvas(
        canvasRef.current,
        visitor.accessCode,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error(error);
        }
      );
    }
  }, [visitor.accessCode, open]);

  useEffect(() => {
    if (!open) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(visitor.validUntil);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [visitor.validUntil, open]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `visitor-${visitor.visitorName.replace(/\s+/g, "-")}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Visitor Access Code</DialogTitle>
          <DialogDescription>
            Show this QR code to security at the gate
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Visitor Details */}
          <div className="p-4 rounded-lg bg-muted">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Visitor Name</p>
                <p className="font-medium">{visitor.visitorName}</p>
              </div>
              {visitor.visitorPhone && (
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{visitor.visitorPhone}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Valid From</p>
                <p className="font-medium">{new Date(visitor.validFrom).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valid Until</p>
                <p className="font-medium">{new Date(visitor.validUntil).toLocaleString()}</p>
              </div>
              {visitor.purpose && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Purpose</p>
                  <p className="font-medium">{visitor.purpose}</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <canvas ref={canvasRef} data-testid="qr-code-canvas" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Access Code</p>
              <p className="text-lg font-mono font-semibold" data-testid="text-access-code">
                {visitor.accessCode}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{timeRemaining}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={handleDownload} data-testid="button-download-qr">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
