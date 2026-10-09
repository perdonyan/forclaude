import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface Option { key:string; label:string; icon:React.ComponentType<{className?:string}>; }
export function GroupSelectorDropdown({options,selected,onSelect}:{options:Option[];selected:string;onSelect:(key:string)=>void}) {
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState({top:0,left:0,maxHeight:320});
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  const active=options.find(option=>option.key===selected)||options[0];
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const rect=triggerRef.current?.getBoundingClientRect();
      if(!rect)return;
      const below=window.innerHeight-rect.bottom-16,above=rect.top-16;
      const up=below<160&&above>below;
      const maxHeight=Math.max(40,Math.min(320,up?above:below));
      const height=Math.min(maxHeight,options.length*42+12);
      setPosition({left:Math.max(8,Math.min(rect.right-208,window.innerWidth-216)),top:up?rect.top-height-8:rect.bottom+8,maxHeight});
    };
    place();
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,options.length]);
  useEffect(()=>{
    if(!open)return;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const pointer=(event:PointerEvent)=>{
      if(!triggerRef.current?.contains(event.target as Node)&&!menuRef.current?.contains(event.target as Node))setOpen(false);
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false);triggerRef.current?.focus();}
    };
    document.addEventListener('pointerdown',pointer);
    document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',key);};
  },[open]);
  if(!active)return null;
  const Icon=active.icon;
  return <>
    <button ref={triggerRef} type="button" aria-label={'Select group: '+active.label} aria-haspopup="menu" aria-expanded={open} aria-controls={open?'permissions-group-dropdown':undefined} title="Select group" onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);}}} className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-sky-400 hover:bg-slate-800 cursor-pointer text-xs font-medium normal-case tracking-normal focus-visible:ring-2 focus-visible:ring-sky-500 max-w-full">
      <Icon className="w-4 h-4 shrink-0"/><span className="max-w-40 truncate">{active.label}</span><ChevronDown className="w-3.5 h-3.5 shrink-0"/>
    </button>
    {open&&createPortal(<div ref={menuRef} id="permissions-group-dropdown" role="menu" aria-label="Groups" style={{position:'fixed',top:position.top,left:position.left,maxHeight:position.maxHeight,width:208,maxWidth:'calc(100vw - 16px)'}} className="z-[80] rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl space-y-1 overflow-y-auto" onKeyDown={event=>{
      const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button')||[]);
      const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
        buttons[next]?.focus();
      }else if(event.key==='Tab')setOpen(false);
    }}>
      {options.map(option=>{const OptionIcon=option.icon;return <button key={option.key} type="button" role="menuitemradio" aria-checked={selected===option.key} onClick={()=>{onSelect(option.key);setOpen(false);triggerRef.current?.focus();}} className={'w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs hover:bg-slate-800 hover:text-sky-400 text-left cursor-pointer focus-visible:outline-none focus-visible:bg-slate-800 focus-visible:text-sky-400 '+(selected===option.key?'text-sky-400':'text-slate-200')}>
        <OptionIcon className="w-4 h-4 shrink-0"/><span className="flex-1 min-w-0 break-words">{option.label}</span>{selected===option.key&&<Check className="w-3.5 h-3.5 shrink-0"/>}
      </button>;})}
    </div>,document.body)}
  </>;
}
