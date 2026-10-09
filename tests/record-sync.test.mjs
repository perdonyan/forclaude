import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordSync } from '../src/utils/recordSync.mjs';

const initial=()=>({drones:[{id:'d1',notes:'old'},{id:'d2',notes:'other'}],handoverForms:[],recordVersions:{drones:{d1:1,d2:1},handoverForms:{}}});
test('browser batches related changes and sends only changed records',async()=>{
  let state=initial(),calls=[];const queue=new RecordSync({authenticated:()=>true,onError:assert.fail,publish:()=>{},reload:async()=>state,request:async ops=>{calls.push(ops);state={...state,recordVersions:{drones:{d1:2,d2:1},handoverForms:{h1:1}}};return {state};}});
  queue.accept(state);queue.mutate('drones',[{id:'d1',notes:'changed'},{id:'d2',notes:'other'}]);queue.mutate('handoverForms',[{id:'h1'}]);
  assert.equal(await queue.settled(),true);assert.equal(calls.length,1);assert.equal(calls[0].length,2);assert.deepEqual(calls[0].map(o=>o.id),['d1','h1']);assert.equal(calls[0][0].version,1);
});
test('server rejection reloads authoritative state and suppresses success',async()=>{
  const errors=[],published=[];const state=initial();const queue=new RecordSync({authenticated:()=>true,onError:m=>errors.push(m),publish:s=>published.push(s),reload:async()=>state,request:async()=>{throw new Error('Conflict');}});
  queue.accept(state);queue.mutate('drones',[{id:'d1',notes:'failed'},{id:'d2',notes:'other'}]);assert.equal(await queue.settled(),false);assert.deepEqual(errors,['Conflict']);assert.equal(published.at(-1).drones[0].notes,'old');
});
test('cached data before authentication or initial state cannot be uploaded',()=>{
  let count=0;const queue=new RecordSync({authenticated:()=>false,onError:()=>{},publish:()=>{},reload:async()=>null,request:async()=>{count++;}});
  queue.mutate('drones',[{id:'cached'}]);assert.equal(count,0);assert.equal(queue.busy,false);
});
test('a second local edit during a save rebases only its own committed record',async()=>{
  let state=initial(),release,startedResolve;const started=new Promise(r=>startedResolve=r),gate=new Promise(r=>release=r),calls=[];
  const queue=new RecordSync({authenticated:()=>true,onError:assert.fail,publish:()=>{},reload:async()=>state,request:async ops=>{calls.push(ops);if(calls.length===1){startedResolve();await gate;}state={...state,drones:ops.map(o=>o.record),recordVersions:{drones:{d1:calls.length+1,d2:1},handoverForms:{}}};return {state};}});
  queue.accept(state);queue.mutate('drones',[{id:'d1',notes:'first'},{id:'d2',notes:'other'}]);await started;
  queue.mutate('drones',[{id:'d1',notes:'second'},{id:'d2',notes:'other'}]);release();assert.equal(await queue.settled(),true);assert.equal(calls[1][0].version,2);
});
test('signout discards pending browser changes',async()=>{
  let count=0;const queue=new RecordSync({authenticated:()=>true,onError:assert.fail,publish:()=>{},reload:async()=>null,request:async()=>{count++;}});
  queue.accept(initial());queue.mutate('drones',[{id:'d1',notes:'pending'},{id:'d2',notes:'other'}]);const wait=queue.settled();queue.clear();assert.equal(await wait,false);assert.equal(count,0);
});
