import React, { useEffect, useState, useRef } from 'react';
import { AppDropdown } from './AppDropdown';
import { X, Download, DatabaseBackup, Upload, RotateCcw } from 'lucide-react';
import { getClientJwtToken, realtimeSync } from '../utils/realtimeSync';
interface Backup {name:string;createdAt:string;hasConfiguration?:boolean;scheduleKind?:string;backupType?:string}
export function AdminSettings({onClose,isAdmin=false}:{onClose:()=>void;isAdmin?:boolean}) {
  const [backupType,setBackupType]=useState<'database'|'configuration'>('database');
  const [backups,setBackups]=useState<Backup[]>([]);
  const [dateRange,setDateRange]=useState('ALL');
  const [page,setPage]=useState(1);
  const historyListRef=useRef<HTMLDivElement>(null);
  const [schedule,setSchedule]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [confirmation,setConfirmation]=useState('');
  const [restored,setRestored]=useState<{directory:string;message:string;configurationFile?:string;backupType?:string}|null>(null);
  async function request(url:string,method='GET',body?:any,upload?:File) {
    const response=await fetch('/api/admin/backups'+url,{method,headers:{
      Authorization:'Bearer '+getClientJwtToken(),
      ...(method==='POST'?{'x-csrf-token':await realtimeSync.getCsrfToken(),'Content-Type':upload?'application/octet-stream':'application/json'}:{})
    },body:upload || (body===undefined?undefined:JSON.stringify(body))});
    if(!response.ok) {const data=await response.json();throw new Error(data.error || 'Request failed.');}
    return response;
  }
  async function refresh() {
    const data=await (await request('?type='+backupType)).json();setBackups(data.backups);setPage(1);
    const interval=data.intervalMinutes%60===0 ? data.intervalMinutes/60+' hours' : data.intervalMinutes+' minutes';
    setSchedule((backupType==='database'?'Database and documents: every '+interval+' plus daily at '+data.dailyTime:'Configuration: daily at '+data.dailyTime+' and when settings change')+' ('+data.timeZone+'). Retained for '+data.retentionDays+' days.');
  }
  useEffect(()=>{setBackups([]);setSelected(null);setRestored(null);setError('');setMessage('');if(isAdmin){setBusy(true);refresh().catch(err=>setError(err.message)).finally(()=>setBusy(false));}},[isAdmin,backupType]);
  useEffect(()=>{const listener=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)onClose();};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[busy,onClose]);
  const cutoff=dateRange==='ALL' ? -Infinity : Date.now()-Number(dateRange)*86400000;
  const filteredBackups=backups.filter(backup=>dateRange==='ALL'||Date.parse(backup.createdAt)>=cutoff)
    .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  const pageCount=Math.max(1,Math.ceil(filteredBackups.length/10));
  const currentPage=Math.min(page,pageCount);
  const start=(currentPage-1)*10;
  const visibleBackups=filteredBackups.slice(start,start+10);
  useEffect(()=>{setPage(1);},[backupType,dateRange]);
  useEffect(()=>{if(historyListRef.current)historyListRef.current.scrollTop=0;},[backupType,dateRange,currentPage]);
  async function act(task:()=>Promise<void>) {setBusy(true);setError('');setMessage('');try{await task();}catch(err:any){setError(err.message);}finally{setBusy(false);}}
  const button='px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-2 disabled:opacity-50 cursor-pointer';
  return <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="admin-settings-title" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 id="admin-settings-title" className="text-sm font-bold text-slate-100">Backup &amp; Restore</h2>
        <button onClick={onClose} disabled={busy} aria-label="Close settings" className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
      </div>
      {isAdmin && <>
      <div role="tablist" aria-label="Backup type" className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {(['database','configuration'] as const).map(type=><button key={type} type="button" role="tab" aria-selected={backupType===type} disabled={busy} onClick={()=>setBackupType(type)} className={'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 '+(backupType===type?'bg-slate-800 border-slate-700 text-sky-400':'border-transparent text-slate-400 hover:bg-slate-800')}>{type==='database'?'Database & Attached Documents':'Configuration'}</button>)}
      </div>
      <div><h3 className="text-sm font-semibold text-sky-400 flex items-center gap-2"><DatabaseBackup className="w-4 h-4"/>Backup &amp; Restore</h3>
        <p className="mt-2 text-xs text-slate-400">{schedule}</p>
        <p className="mt-2 text-xs text-slate-400">{backupType==='database'?'Database backups include asset records, users, group permissions and attached documents. Server configuration is backed up separately.':'Configuration backups contain server settings and security secrets, without database records or documents. Keep downloaded files private.'} {backupType==='database'?'Database downloads and uploads support up to 64 MB uncompressed.':'Configuration files support up to 1 MB.'}</p>
      </div>
      {error&&<p role="alert" className="text-xs text-rose-300 bg-rose-950/40 rounded-lg p-3">{error}</p>}
      {message&&<p role="status" className="text-xs text-emerald-300 bg-emerald-950/40 rounded-lg p-3">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className={button} onClick={()=>act(async()=>{await request('','POST',{type:backupType});await refresh();setMessage('Backup created successfully.');})}><DatabaseBackup className="w-4 h-4"/>{busy?'Please wait…':backupType==='database'?'Create Database Backup':'Create Configuration Backup'}</button>
        <label className={button}><Upload className="w-4 h-4"/>Upload Backup
          <input type="file" accept=".fleet.gz" disabled={busy} className="sr-only" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)act(async()=>{await request('/upload?type='+backupType,'POST',undefined,file);await refresh();setMessage('Uploaded backup verified and added to history.');});}}/>
        </label>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xs font-semibold text-slate-300">Backup History <span className="text-slate-500">({backups.length} total)</span></h4>
          <AppDropdown aria-label="Filter backups by date" value={dateRange} onChange={event=>setDateRange(event.target.value)} disabled={busy} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
            <option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="ALL">All dates</option>
          </AppDropdown>
        </div>
        <div ref={historyListRef} role="region" aria-label="Backup history list" tabIndex={0} className="h-[min(24rem,40vh)] min-w-0 overflow-y-auto overscroll-contain space-y-2 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg">
        {!visibleBackups.length&&<p className="text-xs text-slate-500 p-4">{busy?'Loading backups…':backups.length?'No backups in this date range.':'No completed backups yet.'}</p>}
        {visibleBackups.map(backup=><div key={backup.name} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50">
          <div className="min-w-0"><p className="text-xs text-slate-200">{new Date(backup.createdAt).toLocaleString()}</p><p className="text-[11px] text-slate-500 mt-1">{backup.scheduleKind==='interval+daily'?'Scheduled + daily · ':backup.scheduleKind==='daily'?'Daily · ':backup.scheduleKind==='interval'?'Scheduled · ':''}{backupType==='configuration'?'Configuration only':backup.hasConfiguration?'Database & documents (older combined backup)':'Database & attached documents'}</p></div>
          <div className="flex gap-2">
            <button className={button} disabled={busy} onClick={()=>act(async()=>{const response=await request('/'+encodeURIComponent(backup.name)+'/download');const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=backup.name+'.fleet.gz';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);})}><Download className="w-3.5 h-3.5"/>Download</button>
            <button className={button} disabled={busy} onClick={()=>{setSelected(backup.name);setConfirmation('');setRestored(null);}}><RotateCcw className="w-3.5 h-3.5"/>Restore</button>
          </div>
        </div>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span aria-live="polite">{filteredBackups.length ? 'Showing '+(start+1)+'–'+Math.min(start+10,filteredBackups.length)+' of '+filteredBackups.length : '0 backups'} · Page {currentPage} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" className={button} disabled={busy||currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button>
            <button type="button" className={button} disabled={busy||currentPage===pageCount} onClick={()=>setPage(currentPage+1)}>Next</button>
          </div>
        </div>
      </div>
      {selected&&<div className="p-4 rounded-lg border border-amber-800 bg-amber-950/30 space-y-3 text-xs">
        <h4 className="font-semibold text-amber-300">Restore Backup</h4>
        <p className="text-slate-300">{backupType==='configuration'?'A configuration safety copy will be created first. Restore prepares a verified settings file for review. Apply the settings to the server configuration and restart; the database is unchanged.':'Safety copies will be created first. Restore prepares a separate verified database and documents. To activate it, stop the server, change its data directory, then restart. Server configuration can be restored separately if needed.'}</p>
        <p className="text-slate-400 break-all">{selected}</p>
        <input aria-label="Type RESTORE to confirm" placeholder="Type RESTORE to confirm" value={confirmation} onChange={event=>setConfirmation(event.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"/>
        <div className="flex gap-2"><button className={button} disabled={busy||confirmation!=='RESTORE'} onClick={()=>act(async()=>{const data=await (await request('/'+encodeURIComponent(selected)+'/restore','POST',{confirmation})).json();setRestored(data);setSelected(null);await refresh();})}>Prepare Restore</button><button className={button} disabled={busy} onClick={()=>setSelected(null)}>Cancel</button></div>
      </div>}
      {restored&&<div role="status" className="p-4 rounded-lg border border-emerald-800 bg-emerald-950/30 text-xs space-y-2 text-emerald-200">
        <p className="font-semibold">Restore ready for activation</p><p>{restored.message}</p><p className="break-all font-mono">{restored.backupType==='configuration'?'Configuration file: '+restored.configurationFile:'DATA_DIR='+restored.directory}</p>
      </div>}
      </>}
    </section>
  </div>;
}
