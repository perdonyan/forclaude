import React, { useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';

export function AssetDeleteConfirmation({label,onCancel,onConfirm}:{label:string;onCancel:()=>void;onConfirm:()=>void}) {
  const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
    const handleKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();onCancel();}
      if(event.key==='Tab'){
        const buttons=dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if(!buttons?.length)return;
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',handleKey);
    return ()=>{document.removeEventListener('keydown',handleKey);previousFocus?.focus();};
  },[onCancel]);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
    <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="asset-delete-title" aria-describedby="asset-delete-description" className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="asset-delete-title" className="flex items-center gap-2 text-sm font-bold text-slate-100"><Trash2 className="w-4 h-4 text-rose-400"/>Delete Asset?</h3>
        <button type="button" aria-label="Cancel deletion" onClick={onCancel} className="p-1 text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4"/></button>
      </div>
      <p id="asset-delete-description" className="text-xs text-slate-300 leading-relaxed">Are you sure you want to delete <strong className="text-slate-100 break-words">{label}</strong> from Inventory?</p>
      <div className="flex justify-end gap-2">
        <button data-cancel type="button" onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer">Cancel</button>
        <button type="button" onClick={onConfirm} className="px-4 py-2 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-lg cursor-pointer">Delete</button>
      </div>
    </div>
  </div>;
}
