import React, { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

type Option = {value:string;label:string;disabled:boolean};
const textContent=(node:React.ReactNode):string=>Children.toArray(node).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<{children?:React.ReactNode}>(child)?textContent(child.props.children):'').join('');
export function collectDropdownOptions(children:React.ReactNode,inheritedDisabled=false):Option[] {
  return Children.toArray(children).flatMap(child=>{
    if(!isValidElement<{value?:string|number;label?:string;disabled?:boolean;children?:React.ReactNode}>(child))return [];
    if(child.type==='option')return [{value:String(child.props.value??textContent(child.props.children)),label:child.props.label??textContent(child.props.children),disabled:inheritedDisabled||!!child.props.disabled}];
    return collectDropdownOptions(child.props.children,inheritedDisabled||!!child.props.disabled);
  });
}

export function AppDropdown({children,className='',onChange,onInvalid,value,defaultValue,disabled,title,id:fieldId,...props}:React.SelectHTMLAttributes<HTMLSelectElement>) {
  const options=collectDropdownOptions(children);
  const [localValue,setLocalValue]=useState(String(defaultValue??options[0]?.value??''));
  const selected=String(value??localValue);
  const [open,setOpen]=useState(false);
  const [validation,setValidation]=useState('');
  const [position,setPosition]=useState({left:0,top:0,width:208,maxHeight:320});
  const nativeRef=useRef<HTMLSelectElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  const typeahead=useRef({text:'',time:0});
  const id=useId();
  const layout=className.split(/\s+/).filter(token=>/^(?:(?:sm|md|lg|xl):)?(?:w-|min-w-|max-w-|flex-1|mt-|mb-|ml-|mr-|self-)/.test(token)).join(' ');
  const paddedIcon=className.includes('pl-9')?'pl-9':className.includes('pl-8')?'pl-8':'';
  const active=options.find(option=>option.value===selected)||options[0];
  const close=(focus=false)=>{setOpen(false);if(focus)triggerRef.current?.focus();};
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const rect=triggerRef.current?.getBoundingClientRect();if(!rect)return;
      const width=Math.min(Math.max(208,rect.width),window.innerWidth-16);
      const below=window.innerHeight-rect.bottom-16,above=rect.top-16;
      const up=below<160&&above>below;
      const maxHeight=Math.max(40,Math.min(320,up?above:below));
      const height=Math.min(maxHeight,options.length*44+12);
      setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),top:up?rect.top-height-8:rect.bottom+8,width,maxHeight});
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,options.length]);
  useEffect(()=>{
    if(!open)return;
    const buttons=menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    const checked=menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)');
    (checked||buttons?.[0])?.focus();
    const pointer=(event:PointerEvent)=>{if(!triggerRef.current?.contains(event.target as Node)&&!menuRef.current?.contains(event.target as Node))setOpen(false);};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);triggerRef.current?.focus();}};
    document.addEventListener('pointerdown',pointer);
    document.addEventListener('keydown',key,true);
    return ()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',key,true);};
  },[open]);
  const choose=(option:Option)=>{
    if(disabled||option.disabled)return;
    const select=nativeRef.current;if(!select)return;
    if(select.value===option.value){close(true);return;}
    select.value=option.value;
    setLocalValue(option.value);setValidation('');
    select.dispatchEvent(new Event('change',{bubbles:true}));
    close(true);
  };
  return <span className={'relative inline-flex align-middle min-w-0 '+layout}>
    <select {...props} id={fieldId?fieldId+'-native':undefined} ref={nativeRef} value={value} defaultValue={defaultValue} disabled={disabled} tabIndex={-1} aria-hidden="true" title={title} style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}} onChange={event=>{setLocalValue(event.target.value);setValidation('');onChange?.(event);}} onInvalid={event=>{onInvalid?.(event);event.preventDefault();setValidation(event.currentTarget.validationMessage);triggerRef.current?.focus();setOpen(true);}}>{children}</select>
    <button id={fieldId} ref={triggerRef} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id+'-options':undefined} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-required={props.required} aria-invalid={!!validation} aria-describedby={validation?id+'-validation':props['aria-describedby']} title={title} disabled={disabled} onClick={()=>setOpen(current=>!current)} onKeyDown={event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);}}} className={'w-full min-w-0 flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-sky-400 hover:bg-slate-800 cursor-pointer text-xs font-medium normal-case tracking-normal text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed '+paddedIcon}>
      <span className="min-w-0 truncate">{active?.label||'Select…'}</span><ChevronDown className="w-3.5 h-3.5 shrink-0"/>
    </button>
    {validation&&<span id={id+'-validation'} role="alert" className="absolute top-full left-0 z-[100] text-xs text-rose-300 bg-slate-900 border border-slate-700 rounded-lg p-2">{validation}</span>}
    {open&&!disabled&&createPortal(<div id={id+'-options'} ref={menuRef} role="listbox" aria-label={props['aria-label']||'Options'} style={{position:'fixed',...position,maxWidth:'calc(100vw - 16px)'}} className="z-[200] rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl space-y-1 overflow-y-auto" onKeyDown={event=>{
      const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);
      const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
        buttons[next]?.focus();
      }else if(event.key==='Tab'){event.preventDefault();close(true);}
      else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key!==' '){
        const now=Date.now();typeahead.current={text:(now-typeahead.current.time<600?typeahead.current.text:'')+event.key.toLowerCase(),time:now};
        const match=buttons.find(button=>button.textContent?.toLowerCase().trim().startsWith(typeahead.current.text));
        match?.focus();
      }
    }}>
      {options.map((option,index)=><button key={option.value+'-'+index} type="button" role="option" aria-selected={option.value===selected} disabled={option.disabled} onClick={()=>choose(option)} className={'w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs hover:bg-slate-800 hover:text-sky-400 text-left cursor-pointer focus-visible:outline-none focus-visible:bg-slate-800 focus-visible:text-sky-400 disabled:opacity-40 disabled:cursor-not-allowed '+(option.value===selected?'text-sky-400':'text-slate-200')}>
        <span className="flex-1 min-w-0 break-words">{option.label}</span>{option.value===selected&&<Check className="w-3.5 h-3.5 shrink-0"/>}
      </button>)}
    </div>,document.body)}
  </span>;
}
