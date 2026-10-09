import React, { useState } from 'react';
import { Users, Plus, Search, X, Edit3, Trash2, KeyRound } from 'lucide-react';
import { UserItem, UserGroup, GroupPrivileges, SYSTEM_PRIVILEGES, getUserRole } from '../types/drone';
import { realtimeSync } from '../utils/realtimeSync';

interface Props {
  groups:UserGroup[]; users:UserItem[]; privileges:GroupPrivileges; isAdmin:boolean;
  onAddGroup:()=>void; onViewMembers:(key:string)=>void; onConfigurePermissions:(key:string)=>void;
}
export function UserAccessPanels({groups,users,privileges,isAdmin,onAddGroup,onViewMembers,onConfigurePermissions}:Props) {
  const [search,setSearch]=useState('');
  const [manage,setManage]=useState<{group:UserGroup;deleting:boolean}|null>(null);
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const rows=[...(['ADMIN','OFFICER','USER'] as const).map(name=>({id:name,name,baseRole:name,key:name,builtin:true})),...groups.map(group=>({...group,key:'GROUP:'+group.id,builtin:false}))];
  const filtered=rows.filter(group=>group.name.toLowerCase().includes(search.toLowerCase()));
  const members=(id:string,builtin:boolean)=>users.filter(user=>builtin?!user.groupId&&getUserRole(user)===id:user.groupId===id).length;
  const rowAction='p-1 text-slate-400 hover:bg-slate-800 rounded transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500';
  const open=(group:UserGroup,deleting:boolean)=>{setError('');setManage({group,deleting});setName(group.name);};
  return <div className="space-y-4">
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <div className="relative"><Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search groups" placeholder="Search groups…" value={search} onChange={event=>setSearch(event.target.value)} className="w-full sm:w-56 bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200"/></div>
      </div>
      {isAdmin&&<button type="button" onClick={onAddGroup} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 cursor-pointer"><Plus className="w-3.5 h-3.5"/>Add Group</button>}
    </div>
    {error&&!manage&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
    {message&&<p role="status" className="text-xs text-emerald-300">{message}</p>}
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800">
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr] gap-3 px-3 py-2.5 bg-slate-950/80 text-[11px] uppercase text-slate-400"><span>Group</span><span>Members</span><span>Permissions</span><span className="text-right">Actions</span></div>
      {filtered.map(group=><div key={group.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr] items-center gap-3 px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0"><Users className="w-4 h-4 text-sky-400 shrink-0"/><span className="text-slate-100 break-words">{group.name}</span></div>
        <span className="text-slate-300">{members(group.id,group.builtin)} members</span>
        <span className="text-slate-300">{SYSTEM_PRIVILEGES.filter(permission=>privileges[group.key]?.[permission.id]).length} / {SYSTEM_PRIVILEGES.length}</span>
        <div className="flex items-center gap-1.5 md:justify-end">
          <button type="button" title="View Members" aria-label={'View members of '+group.name} className={rowAction+' hover:text-sky-400'} onClick={()=>onViewMembers(group.key)}><Users className="w-3.5 h-3.5"/></button>
          <button type="button" title={isAdmin?'Configure Permissions':'View Permissions'} aria-label={'Permissions for '+group.name} className={rowAction+' hover:text-amber-400'} onClick={()=>onConfigurePermissions(group.key)}><KeyRound className="w-3.5 h-3.5"/></button>
          {isAdmin&&!group.builtin&&<>{[false,true].map(deleting=><button type="button" key={String(deleting)} title={deleting?'Delete':'Edit'} aria-label={(deleting?'Delete group ':'Edit group ')+group.name} className={rowAction+(deleting?' hover:text-rose-400':' hover:text-sky-400')} onClick={()=>open(groups.find(item=>item.id===group.id)!,deleting)}>{deleting?<Trash2 className="w-3.5 h-3.5"/>:<Edit3 className="w-3.5 h-3.5"/>}</button>)}</>}
        </div>
      </div>)}
      {!filtered.length&&<p className="p-8 text-center text-xs text-slate-400">No matching groups.</p>}
    </div>
    {manage&&isAdmin&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="manage-group-title" onSubmit={async event=>{
        event.preventDefault();setBusy(true);setError('');
        try{await realtimeSync.manageGroup(manage.group.id,manage.deleting?'DELETE':'PATCH',manage.deleting?undefined:{name});setManage(null);setMessage(manage.deleting?'Group deleted.':'Group updated.');}
        catch(error:any){setError(error.message);}finally{setBusy(false);}
      }} className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between"><h3 id="manage-group-title" className="text-sm font-bold text-slate-100">{manage.deleting?'Delete Group':'Edit Group'}</h3><button type="button" disabled={busy} aria-label="Close dialog" onClick={()=>setManage(null)}><X className="w-4 h-4 text-slate-400"/></button></div>
        {manage.deleting?<p className="text-xs text-slate-300">Delete <strong>{manage.group.name}</strong>? Move its users to another group first.</p>:<>
          <label className="block text-xs text-slate-300">Group Name<input autoFocus required maxLength={50} value={name} onChange={event=>setName(event.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"/></label>
          <p className="text-xs text-slate-400">Manage approval access using Approve Requests in Permissions.</p>
        </>}
        {error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2"><button autoFocus={manage.deleting} type="button" disabled={busy} onClick={()=>setManage(null)} className="px-4 py-2 rounded-lg text-xs text-slate-200 bg-slate-800">Cancel</button><button disabled={busy||(!manage.deleting&&!name.trim())} className={'px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 disabled:opacity-50 '+(manage.deleting?'bg-rose-400':'bg-sky-400')}>{busy?'Saving…':manage.deleting?'Delete':'Save Changes'}</button></div>
      </form>
    </div>}
  </div>;
}
