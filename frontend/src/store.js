import { demoData, emptyData } from './seed.js';

const LEGACY_KEY = 'harbor-finance-data-v1';
export const uniqueId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes);
  else for (let index=0;index<bytes.length;index+=1) bytes[index]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map((value)=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const remoteTransport = {
  async get() {
    const response = await fetch('/api/data', { headers:{ Accept:'application/json', 'X-User-Id':'local-user' } });
    if (response.status === 204) return null;
    if (!response.ok) throw new Error('Could not load financial data from MySQL');
    return response.json();
  },
  async put(data) {
    const response = await fetch('/api/data', { method:'PUT', headers:{ 'Content-Type':'application/json', 'X-User-Id':'local-user' }, body:JSON.stringify(data) });
    if (!response.ok) { const error=await response.json().catch(()=>({})); throw new Error(error.message || 'Could not save financial data to MySQL'); }
    return response.json();
  }
};

export class FinanceRepository {
  constructor(transport = remoteTransport) { this.transport = transport; this.cache = null; this.listeners = new Set(); this.pending = Promise.resolve(); }
  load() { return this.cache; }
  async initialize(useDemo = true) {
    this.cache = await this.transport.get();
    if (!this.cache) {
      const legacy = typeof localStorage === 'undefined' ? null : localStorage.getItem(LEGACY_KEY);
      this.cache = legacy ? JSON.parse(legacy) : (useDemo ? demoData() : emptyData());
      await this.transport.put(this.cache);
      if (legacy) localStorage.removeItem(LEGACY_KEY);
    }
    return this.cache;
  }
  save(data) { this.cache = structuredClone(data); this.listeners.forEach((fn) => fn(this.cache)); this.pending = this.pending.then(() => this.transport.put(this.cache)); return this.pending; }
  flush() { return this.pending; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  list(resource) { return this.cache?.[resource] || []; }
  create(resource, values) { const record = { ...values, id: `${resource.slice(0,4)}-${uniqueId()}` }; this.cache[resource] = [...(this.cache[resource] || []), record]; this.save(this.cache); return record; }
  update(resource, id, values) { const index = (this.cache[resource] || []).findIndex((item) => item.id === id); if (index < 0) throw new Error('Record not found'); this.cache[resource][index] = { ...this.cache[resource][index], ...values, id }; this.save(this.cache); return this.cache[resource][index]; }
  remove(resource, id) { const before = (this.cache[resource] || []).length; this.cache[resource] = (this.cache[resource] || []).filter((item) => item.id !== id); if (before === this.cache[resource].length) throw new Error('Record not found'); this.save(this.cache); }
  replace(data) { if (!data || data.version !== 1 || !data.settings) throw new Error('This backup is not valid'); this.save(data); return data; }
  clear(demo = false) { const replacement=demo ? demoData() : emptyData(); this.save(replacement); return replacement; }
}
