import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface DroneBarcodeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  background?: string;
  lineColor?: string;
  className?: string;
}

export const DroneBarcode: React.FC<DroneBarcodeProps> = ({
  value,
  width = 1.5,
  height = 45,
  fontSize = 12,
  displayValue = true,
  background = 'transparent',
  lineColor = '#f8fafc',
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          font: 'JetBrains Mono',
          background,
          lineColor,
          margin: 4,
        });
      } catch (err) {
        console.error('Failed to generate barcode for:', value, err);
      }
    }
  }, [value, width, height, fontSize, displayValue, background, lineColor]);

  if (!value) {
    return <span className="text-xs text-slate-500 italic">No SN</span>;
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
};
