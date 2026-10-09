import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface DroneQRCodeProps {
  value: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
  className?: string;
}

export const DroneQRCode: React.FC<DroneQRCodeProps> = ({
  value,
  size = 120,
  darkColor = '#f8fafc',
  lightColor = '#00000000', // transparent
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1,
          color: {
            dark: darkColor,
            light: lightColor,
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [value, size, darkColor, lightColor]);

  if (!value) {
    return <span className="text-xs text-slate-500 italic">No SN</span>;
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
};
