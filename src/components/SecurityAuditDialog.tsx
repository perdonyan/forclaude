import React, { useCallback, useEffect, useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { AuditLogEntry } from '../types/drone';
import { realtimeSync } from '../utils/realtimeSync';
import { AuditTrailView } from './AuditTrailView';

export const SecurityAuditDialog: React.FC<{onClose:()=>void}> = ({onClose}) => {
  const [logs,setLogs] = useState<AuditLogEntry[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const refresh = useCallback(async()=>{
    setLoading(true);setError('');
    try {setLogs(await realtimeSync.getAuditLogs());}
    catch(error:any){setError(error.message || 'Unable to load the security audit trail.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    document.addEventListener('keydown',handleKey);
    return ()=>document.removeEventListener('keydown',handleKey);
  },[onClose]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="security-audit-title" className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <h3 id="security-audit-title" className="flex items-center gap-2 text-sm font-bold text-slate-100"><ShieldAlert className="w-5 h-5 text-sky-400"/>Security Audit Trail</h3>
        <button autoFocus type="button" aria-label="Close Security Audit Trail" onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4"/></button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <AuditTrailView auditLogs={logs} onRefresh={refresh} isLoading={loading}/>
    </div>
  </div>;
};
