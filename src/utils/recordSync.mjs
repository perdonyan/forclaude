const clone=value=>JSON.parse(JSON.stringify(value));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// Coalesce all React state changes in one event into one transaction. The browser
// sends only changed records with their observed versions, never a full collection.
export class RecordSync {
  constructor({request,reload,publish,onError,authenticated}) {
    Object.assign(this,{request,reload,publish,onError,authenticated});
    this.state=null; this.versions={}; this.pending=new Map(); this.running=false; this.timer=null; this.waiters=[]; this.failed=false; this.generation=0;
  }
  get busy() { return this.running || this.pending.size>0 || this.timer!==null; }
  accept(state) {
    if (this.busy) return;
    this.state=clone(state); this.versions=clone(state.recordVersions || {}); this.publish(state);
  }
  acceptEntity(entity,data,versions) {
    if (!this.state || this.busy) return false;
    this.state[entity]=clone(data); this.versions[entity]=clone(versions || {}); return true;
  }
  mutate(entity,data) {
    if (!this.authenticated() || !Array.isArray(data)) return;
    if (!this.state) { if (data.length) this.onError('Wait for the server data to load before saving.'); return; }
    if (!this.versions[entity]) return;
    const prior=new Map((this.state[entity] || []).map(record=>[record.id,record]));
    const next=new Map(data.map(record=>[record.id,record]));
    for (const id of new Set([...prior.keys(),...next.keys()])) {
      const before=prior.get(id), after=next.get(id);
      if (same(before,after)) continue;
      const key=`${entity}:${id}`, queued=this.pending.get(key);
      this.pending.set(key,{entity,id,version:queued?.version ?? this.versions[entity][id] ?? 0,record:after?clone(after):null});
    }
    this.state[entity]=clone(data);
    if (!this.running && !this.timer && this.pending.size) {
      this.failed=false;
      this.timer=setTimeout(()=>{this.timer=null;void this.flush();},0);
    }
  }
  async flush() {
    if (this.running) return;
    this.running=true;
    const generation=this.generation;
    let latest;
    try {
      while (this.pending.size) {
        const operations=[...this.pending.values()]; this.pending.clear();
        const response=await this.request(operations);
        if (generation!==this.generation) return;
        latest=response.state;
        if (!latest?.recordVersions) throw new Error('The server did not confirm the saved records.');
        // Rebase only records just committed by this workstation. Changes from other
        // workstations still carry their old version and are rejected by the server.
        for (const op of operations) {
          const queued=this.pending.get(`${op.entity}:${op.id}`);
          if (queued && queued.version===op.version && op.record!==null) queued.version=latest.recordVersions[op.entity]?.[op.id] ?? queued.version;
        }
        this.versions=clone(latest.recordVersions);
      }
    } catch(error) {
      if (generation!==this.generation) return;
      this.failed=true; this.pending.clear(); this.onError(error.message || 'The change could not be saved.');
      try { latest=await this.reload(); } catch { latest=null; }
    } finally {
      // Refresh covers broadcasts deferred while the transaction was in progress.
      if (generation===this.generation && !this.failed) {
        try { latest=await this.reload() || latest; } catch { /* use the confirmed response */ }
      }
      if (generation!==this.generation) return;
      this.running=false;
      if (this.pending.size) { void this.flush(); return; }
      if (latest) this.accept(latest);
      else { this.state=null; this.versions={}; }
      const waiters=this.waiters.splice(0); for (const resolve of waiters) resolve(!this.failed);
    }
  }
  settled() { return this.busy?new Promise(resolve=>this.waiters.push(resolve)):Promise.resolve(true); }
  clear() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer=null; this.pending.clear(); this.state=null; this.versions={}; this.running=false;
    for (const resolve of this.waiters.splice(0)) resolve(false);
  }
}
