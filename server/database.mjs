import { normalizeLegacyAccount } from '../src/utils/accountIdentity.mjs';
import { DatabaseSync, backup } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const TABLES = Object.freeze({ drones: 'drones', batteries: 'batteries', accessories: 'accessories', streamingDevices: 'streaming_devices', checkouts: 'checkouts', handoverForms: 'handovers', incidentReports: 'incidents', confiscatedDrones: 'confiscations', users: 'users', notifications: 'notifications', auditLogs: 'audit_events' });
export const OPERATIONAL_ENTITIES = Object.keys(TABLES).filter(k => !['users', 'auditLogs'].includes(k));
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export class DataError extends Error {
  constructor(message, status = 400, code = 'INVALID_DATA') { super(message); this.status = status; this.code = code; }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

export function validateRecord(entity, record) {
  if (!own(TABLES, entity) || !record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id.trim() || record.id.length > 200) throw new DataError('A valid entity and record ID are required.');
  const required = { drones: ['droneName', 'droneSN', 'status'], batteries: ['serialNumber', 'status'], accessories: ['name', 'status'], streamingDevices: ['deviceName', 'serialNumber', 'status'], users: ['employeeId', 'name', 'qatarId'], checkouts: ['droneId', 'status'], handoverForms: ['srNumber', 'status'], incidentReports: ['srReference', 'status'], confiscatedDrones: ['srNumber'], notifications: ['type', 'status'], auditLogs: ['timestamp', 'action'] }[entity];
  for (const key of required) if (typeof record[key] !== 'string' || !record[key].trim()) throw new DataError(`${entity}: ${key} is required.`);
  const statuses = { checkouts: ['CHECKED_OUT', 'RETURNED', 'OVERDUE'], handoverForms: ['ISSUED', 'RETURNED', 'PENDING', 'DRAFT', 'ARCHIVED', 'PENDING_APPROVAL', 'REJECTED'], incidentReports: ['DRAFT', 'SUBMITTED', 'UNDER_INVESTIGATION', 'CLOSED'], notifications: ['PENDING', 'APPROVED', 'REJECTED', 'READ', 'UNREAD'] };
  if (statuses[entity] && !statuses[entity].includes(record.status)) throw new DataError(`${entity}: invalid status.`);
  if (entity === 'users' && record.userRole && !['ADMIN', 'OFFICER', 'USER'].includes(record.userRole)) throw new DataError('Invalid account role.');
  for (const key of ['cycleCount', 'healthPercent', 'batteryLevelOut', 'batteryLevelIn']) if (record[key] !== undefined && (!Number.isFinite(record[key]) || record[key] < 0 || (key !== 'cycleCount' && record[key] > 100))) throw new DataError(`Invalid ${key}.`);
  if (entity === 'handoverForms' && (!Array.isArray(record.equipment) || !Array.isArray(record.accessories))) throw new DataError('Handover equipment and accessories must be arrays.');
}

// Flexible report payloads are retained while IDs, versions, uniqueness, relationships,
// permissions and attachment references are enforced relationally.
export class FleetStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.attachmentDirectory = path.join(this.directory, 'attachments');
    fs.mkdirSync(this.attachmentDirectory, { recursive: true, mode: 0o700 });
    this.filename = path.join(this.directory, 'fleet.sqlite');
    this.db = new DatabaseSync(this.filename);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS security_state(scope TEXT NOT NULL, key TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(scope,key));
      CREATE TABLE IF NOT EXISTS role_permissions(role TEXT NOT NULL CHECK(role IN ('ADMIN','OFFICER','USER')), privilege TEXT NOT NULL, allowed INTEGER NOT NULL CHECK(allowed IN (0,1)), PRIMARY KEY(role,privilege));
      CREATE TABLE IF NOT EXISTS user_groups(id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, base_role TEXT NOT NULL CHECK(base_role IN ('OFFICER','USER')));
      CREATE TABLE IF NOT EXISTS group_permissions(group_id TEXT NOT NULL REFERENCES user_groups(id), privilege TEXT NOT NULL, allowed INTEGER NOT NULL CHECK(allowed IN (0,1)), PRIMARY KEY(group_id,privilege));
      CREATE TABLE IF NOT EXISTS record_registry(entity TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY(entity,id));
      CREATE TABLE IF NOT EXISTS record_links(source_entity TEXT NOT NULL, source_id TEXT NOT NULL, field TEXT NOT NULL, target_entity TEXT NOT NULL, target_id TEXT NOT NULL,
        PRIMARY KEY(source_entity,source_id,field), FOREIGN KEY(source_entity,source_id) REFERENCES record_registry(entity,id), FOREIGN KEY(target_entity,target_id) REFERENCES record_registry(entity,id));
      CREATE TABLE IF NOT EXISTS attachments(hash TEXT PRIMARY KEY, mime_type TEXT NOT NULL, size INTEGER NOT NULL CHECK(size>=0));
      CREATE TABLE IF NOT EXISTS attachment_links(entity TEXT NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL REFERENCES attachments(hash), PRIMARY KEY(entity,id,hash), FOREIGN KEY(entity,id) REFERENCES record_registry(entity,id));`);
    for (const table of Object.values(TABLES)) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS ${table}(id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)), version INTEGER NOT NULL CHECK(version>0), position INTEGER NOT NULL, deleted_at TEXT);
        CREATE INDEX IF NOT EXISTS ${table}_status ON ${table}(json_extract(payload,'$.status')) WHERE deleted_at IS NULL;`);
    }
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=4').get()) this.transaction(()=>{
      const hasAssignments=this.db.prepare('PRAGMA table_info(user_groups)').all().some(column=>column.name==='role_id');
      const hasRolePermissions=!!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_role_permissions'").get();
      if (hasAssignments) for (const group of this.db.prepare('SELECT id,role_id FROM user_groups').all()) {
        if (!group.role_id) continue;
        let grants;
        if (['USER','OFFICER'].includes(group.role_id)) grants=this.db.prepare('SELECT privilege,allowed FROM role_permissions WHERE role=?').all(group.role_id);
        else if (group.role_id.startsWith('ROLE:') && hasRolePermissions) {
          if (!this.db.prepare('SELECT id FROM permission_roles WHERE id=?').get(group.role_id.slice(5))) throw new DataError('Cannot migrate group with a missing assigned role.');
          grants=this.db.prepare('SELECT privilege,allowed FROM custom_role_permissions WHERE role_id=?').all(group.role_id.slice(5));
        } else throw new DataError('Cannot migrate an invalid group role assignment.');
        this.db.prepare('DELETE FROM group_permissions WHERE group_id=?').run(group.id);
        for (const grant of grants) this.db.prepare('INSERT INTO group_permissions VALUES(?,?,?)').run(group.id,grant.privilege,grant.allowed);
      }
      if (hasAssignments) this.db.exec('ALTER TABLE user_groups DROP COLUMN role_id');
      this.db.exec('DROP TABLE IF EXISTS custom_role_permissions; DROP TABLE IF EXISTS permission_roles;');
      this.db.prepare('INSERT INTO schema_migrations VALUES(4,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=5').get()) this.transaction(()=>{
      for (const key of ['INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY']) {
        this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT role,?,allowed FROM role_permissions WHERE privilege='INVENTORY_DELETE_DRONE'").run(key);
        this.db.prepare("INSERT OR IGNORE INTO group_permissions SELECT group_id,?,allowed FROM group_permissions WHERE privilege='INVENTORY_DELETE_DRONE'").run(key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(5,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=6').get()) this.transaction(()=>{
      for (const role of ['ADMIN','OFFICER','USER']) this.db.prepare("INSERT OR IGNORE INTO role_permissions VALUES(?,'APPROVE_REQUESTS',?)").run(role,role==='USER'?0:1);
      this.db.exec("INSERT OR IGNORE INTO group_permissions SELECT id,'APPROVE_REQUESTS',CASE WHEN base_role='OFFICER' THEN 1 ELSE 0 END FROM user_groups");
      this.db.prepare('INSERT INTO schema_migrations VALUES(6,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=7').get()) this.transaction(()=>{
      const groups=this.db.prepare('SELECT id,name,base_role AS baseRole FROM user_groups').all();
      for (const row of this.db.prepare('SELECT id,payload,position,deleted_at FROM users').all()) {
        const account=JSON.parse(row.payload),normalized=normalizeLegacyAccount(row.deleted_at && !account.archivedAt ? {...account,archivedAt:row.deleted_at} : account,groups);
        if (!same(account,normalized)) {
          // Preserve archive markers, positions, references and credentials.
          this.db.prepare('UPDATE users SET payload=?,version=version+1 WHERE id=?').run(JSON.stringify(normalized),row.id);
        }
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(7,?)').run(new Date().toISOString());
    });
    const uniques = { users: ['employeeId', 'qatarId'], drones: ['droneSN'], batteries: ['serialNumber'], streaming_devices: ['serialNumber'], handovers: ['srNumber'], incidents: ['srReference'], confiscations: ['srNumber'] };
    for (const [table, fields] of Object.entries(uniques)) for (const field of fields) this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_${field}_unique ON ${table}(lower(trim(json_extract(payload,'$.${field}')))) WHERE deleted_at IS NULL AND coalesce(json_extract(payload,'$.identityConflict'),0)=0 AND trim(coalesce(json_extract(payload,'$.${field}'),''))<>'';`);
    this.db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES(1,?)').run(new Date().toISOString());
    if (this.db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Database integrity check failed. Restore a verified backup before starting.');
  }

  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); if (error instanceof DataError) throw error; if (String(error.message).includes('UNIQUE constraint')) throw new DataError('A duplicate employee, serial number or report reference exists.', 409, 'DUPLICATE_RECORD'); throw error; }
  }

  initialize(legacyFile, initialState) {
    if (this.db.prepare("SELECT value FROM settings WHERE key='initialized'").get()) return this.load();
    let source = initialState;
    if (fs.existsSync(legacyFile)) {
      // Parsing/validation failures deliberately stop startup. Never overwrite the source.
      source = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
      if (!source || typeof source !== 'object' || !Array.isArray(source.users)) throw new DataError('Legacy data is malformed; restore or repair it before migration.');
      const archive = path.join(this.directory, `legacy-before-migration-${Date.now()}.json`);
      fs.copyFileSync(legacyFile, archive, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(archive, 0o600);
      // Older versions did not persist confiscations. Missing collections are empty,
      // never seeded on restart. Explicit empty arrays are preserved.
      source = { ...source, ...Object.fromEntries(Object.keys(TABLES).filter(k => source[k] === undefined).map(k => [k, []])) };
    }
    // Preserve conflicting legacy personnel without inventing identity numbers.
    // Suspend ALL accounts sharing an identity until an administrator corrects it.
    source=structuredClone(source);
    if (source.userGroups) {
      const grants=source.groupPrivileges || initialState.groupPrivileges;
      source.groupPrivileges={...grants};
      source.userGroups=source.userGroups.map(({roleId,...group})=>{
        if (roleId) source.groupPrivileges['GROUP:'+group.id]={...(grants[roleId] || {})};
        return group;
      });
    }
    source.users=source.users.map(user=>normalizeLegacyAccount(user,source.userGroups || []));
    const legacyGrants=source.groupPrivileges || initialState.groupPrivileges;
    source.groupPrivileges=Object.fromEntries(Object.entries(legacyGrants).map(([key,grants])=>{
      const classification=key.startsWith('GROUP:') ? source.userGroups?.find(group=>group.id===key.slice(6))?.baseRole : key;
      return [key,{APPROVE_REQUESTS:classification==='ADMIN'||classification==='OFFICER',...grants}];
    }));
    const conflicts=new Set();
    for (const field of ['employeeId','qatarId']) {
      const seen=new Map();
      for (const user of source.users) {
        const key=String(user[field] || '').trim().toLowerCase();
        if (key && seen.has(key)) { conflicts.add(user.id); conflicts.add(seen.get(key)); }
        else seen.set(key,user.id);
      }
    }
    for (const user of source.users) if (conflicts.has(user.id)) { user.identityConflict=true; user.accountStatus='SUSPENDED'; }
    if (conflicts.size) console.warn('[Migration] Suspended personnel with duplicate identity fields; administrator correction required:',[...conflicts].join(', '));
    this.transaction(() => {
      if (source.userGroups) this.writeGroups(source.userGroups);
      for (const entity of Object.keys(TABLES)) {
        if (!Array.isArray(source[entity])) throw new DataError(`Migration: ${entity} must be an array.`);
        const seen = new Set();
        source[entity].forEach((record, index) => {
          validateRecord(entity, record);
          if (seen.has(record.id)) throw new DataError(`Migration: duplicate ID in ${entity}.`);
          seen.add(record.id); this.writeRecord(entity, record, index);
        });
      }
      this.writePrivileges(source.groupPrivileges || initialState.groupPrivileges);
      this.rebuildLinks();
      this.db.prepare("INSERT INTO settings VALUES('initialized',?)").run(new Date().toISOString());
    });
    return this.load();
  }

  load() {
    /** @type {Record<string, any>} */
    const state = {};
    for (const [entity, table] of Object.entries(TABLES)) state[entity] = this.db.prepare(`SELECT payload FROM ${table} WHERE deleted_at IS NULL ORDER BY position,id`).all().map(row => JSON.parse(row.payload));
    state.groupPrivileges = { ADMIN: {}, OFFICER: {}, USER: {} };
    for (const row of this.db.prepare('SELECT * FROM role_permissions').all()) state.groupPrivileges[row.role][row.privilege] = !!row.allowed;
    state.userGroups = this.db.prepare('SELECT id,name,base_role AS baseRole FROM user_groups ORDER BY name').all();
    for (const group of state.userGroups) state.groupPrivileges['GROUP:'+group.id] = {};
    for (const row of this.db.prepare('SELECT * FROM group_permissions').all()) state.groupPrivileges['GROUP:'+row.group_id][row.privilege] = !!row.allowed;
    return state;
  }

  versions() {
    return Object.fromEntries(Object.entries(TABLES).map(([entity, table]) => [entity, Object.fromEntries(this.db.prepare(`SELECT id,version FROM ${table} WHERE deleted_at IS NULL`).all().map(row => [row.id, row.version]))]));
  }

  externalize(value, hashes) {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)|application\/pdf);(base64|utf8),(.*)$/s.exec(value);
      if (!match || (match[2]==='utf8' && match[1]!=='image/svg+xml')) throw new DataError('Unsupported attachment format.');
      const data = match[2]==='base64' ? Buffer.from(match[3],'base64') : Buffer.from(match[3].trim().startsWith('<')?match[3]:decodeURIComponent(match[3]),'utf8');
      if (data.length > 15 * 1024 * 1024) throw new DataError('An attachment exceeds 15 MB.');
      const digest = hash(data), filename = path.join(this.attachmentDirectory, digest);
      if (!fs.existsSync(filename)) fs.writeFileSync(filename, data, { flag: 'wx', mode: 0o600 });
      this.db.prepare('INSERT OR IGNORE INTO attachments VALUES(?,?,?)').run(digest, match[1], data.length);
      hashes.add(digest); return `/api/attachments/${digest}`;
    }
    if (typeof value === 'string' && /^\/api\/attachments\/[a-f0-9]{64}$/.test(value)) {
      const digest = value.split('/').pop();
      if (!this.db.prepare('SELECT hash FROM attachments WHERE hash=?').get(digest)) throw new DataError('Attachment does not exist.');
      hashes.add(digest); return value;
    }
    if (Array.isArray(value)) return value.map(item => this.externalize(item, hashes));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, this.externalize(v, hashes)]));
    return value;
  }

  writeRecord(entity, record, position = 0) {
    validateRecord(entity, record);
    const table = TABLES[entity], existing = this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(record.id);
    if (['drones','batteries','accessories','streamingDevices'].includes(entity) && existing && JSON.parse(existing.payload).status === 'CRASHED' && record.status !== 'CRASHED') {
      throw new DataError('CRASHED is a permanent asset status and cannot be changed, including by an administrator.',409,'PERMANENT_CRASHED_STATUS');
    }
    if (entity === 'users' && record.groupId && !record.archivedAt) {
      const group = this.db.prepare('SELECT base_role FROM user_groups WHERE id=?').get(record.groupId);
      if (!group || group.base_role !== record.userRole) throw new DataError('Account group metadata is inconsistent; select the group again in Users.');
    }
    const hashes = new Set(), payload = JSON.stringify(this.externalize(record, hashes));
    this.db.prepare('INSERT OR IGNORE INTO record_registry VALUES(?,?)').run(entity, record.id);
    this.db.prepare(`INSERT INTO ${table} VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=${table}.version+1,position=excluded.position,deleted_at=NULL`).run(record.id, payload, position);
    this.db.prepare('DELETE FROM attachment_links WHERE entity=? AND id=?').run(entity,record.id);
    for (const digest of hashes) this.db.prepare('INSERT INTO attachment_links VALUES(?,?,?)').run(entity,record.id,digest);
    return existing ? Number(existing.version) + 1 : 1;
  }

  writePrivileges(privileges) {
    // Expand legacy grants without overwriting the new independent permissions.
    privileges=Object.fromEntries(Object.entries(privileges).map(([group,grants])=>[group,{...(grants.INVENTORY_DELETE_DRONE!==undefined?Object.fromEntries(['INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY'].map(key=>[key,grants.INVENTORY_DELETE_DRONE])):{}),...grants}]));
    privileges=structuredClone(privileges);
    for (const role of ['ADMIN','OFFICER','USER']) privileges[role]={APPROVE_REQUESTS:role==='ADMIN',...privileges[role]};
    for (const group of this.db.prepare('SELECT id,base_role FROM user_groups').all()) privileges['GROUP:'+group.id]={APPROVE_REQUESTS:false,...privileges['GROUP:'+group.id]};
    this.db.exec('DELETE FROM role_permissions; DELETE FROM group_permissions');
    for (const role of ['ADMIN','OFFICER','USER']) for (const [key,value] of Object.entries(privileges[role] || {})) this.db.prepare('INSERT INTO role_permissions VALUES(?,?,?)').run(role,key,value ? 1 : 0);
    for (const group of this.db.prepare('SELECT id FROM user_groups').all()) for (const [key,value] of Object.entries(privileges['GROUP:'+group.id] || {})) this.db.prepare('INSERT INTO group_permissions VALUES(?,?,?)').run(group.id,key,value ? 1 : 0);
  }

  writeGroups(groups) {
    for (const group of groups) {
      if (!group || typeof group.id !== 'string' || typeof group.name !== 'string' || !group.name.trim() || !['OFFICER','USER'].includes(group.baseRole)) throw new DataError('Invalid user group.');
      if (group.roleId) throw new DataError('Groups manage permissions directly; role assignments are no longer supported.');
      this.db.prepare('INSERT INTO user_groups VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,base_role=excluded.base_role').run(group.id,group.name.trim(),group.baseRole);
    }
  }

  rebuildLinks() {
    this.db.exec('DELETE FROM record_links');
    const state = this.load(), assets = ['drones','batteries','accessories','streamingDevices'];
    const link = (entity,id,field,targetEntity,targetId) => {
      if (!this.db.prepare('SELECT id FROM record_registry WHERE entity=? AND id=?').get(targetEntity,targetId)) throw new DataError(`${entity}: referenced ${targetEntity} record does not exist.`);
      this.db.prepare('INSERT INTO record_links VALUES(?,?,?,?,?)').run(entity,id,field,targetEntity,targetId);
    };
    for (const entity of ['checkouts','incidentReports']) for (const record of state[entity]) if (record.droneId) link(entity,record.id,'droneId','drones',record.droneId);
    for (const record of state.handoverForms) {
      const recipient = state.users.find(u => u.employeeId === record.recipientEmpId);
      if (recipient) link('handoverForms',record.id,'recipient','users',recipient.id);
      for (const [index,item] of [...record.equipment,...record.accessories].entries()) {
        if (item.assetId && assets.includes(item.assetEntity)) { link('handoverForms',record.id,`item:${index}`,item.assetEntity,item.assetId); continue; }
        // Legacy descriptions are not guessed. Only an unambiguous exact serial match
        // becomes a relational link; historical text remains available in the report.
        const serial = String(item.serialNumber || '').trim().toLowerCase();
        if (!serial) continue;
        const matches = assets.flatMap(entity => state[entity].filter(a => [a.droneSN,a.remoteSN,a.serialNumber].some(s => s && String(s).trim().toLowerCase() === serial)).map(a => ({entity,id:a.id})));
        if (matches.length === 1) link('handoverForms',record.id,`item:${index}`,matches[0].entity,matches[0].id);
      }
    }
  }

  // Compatibility path for dedicated account endpoints. Writes only changed records,
  // and restores authoritative memory if validation or disk persistence fails.
  save(state) {
    const before = this.load();
    this.transaction(() => {
      if (state.userGroups) this.writeGroups(state.userGroups);
      for (const [entity, table] of Object.entries(TABLES)) {
        const prior = new Map(before[entity].map(r => [r.id,r])), seen = new Set();
        state[entity].forEach((record,index) => {
          if (seen.has(record.id)) throw new DataError(`Duplicate ID in ${entity}.`);
          seen.add(record.id);
          if (!same(prior.get(record.id),record)) {
            if (entity === 'auditLogs' && prior.has(record.id)) throw new DataError('Audit events cannot be modified.');
            this.writeRecord(entity,record,index);
          }
        });
        for (const id of prior.keys()) if (!seen.has(id)) {
          if (entity === 'auditLogs') throw new DataError('Audit events cannot be removed.');
          this.db.prepare(`UPDATE ${table} SET deleted_at=?,version=version+1 WHERE id=?`).run(new Date().toISOString(),id);
        }
      }
      if (!same(before.groupPrivileges,state.groupPrivileges)) this.writePrivileges(state.groupPrivileges);
      // Remove absent metadata only after personnel and permission references are updated.
      if (state.userGroups) {
        const ids=new Set(state.userGroups.map(group=>group.id));
        for (const row of this.db.prepare('SELECT id FROM user_groups').all()) if (!ids.has(row.id)) {
          if (state.users.some(user=>user.groupId===row.id)) throw new DataError('Move group members before deleting their group.',409);
          this.db.prepare('DELETE FROM group_permissions WHERE group_id=?').run(row.id);
          this.db.prepare('DELETE FROM user_groups WHERE id=?').run(row.id);
        }
      }
      this.rebuildLinks();
    });
    return this.load();
  }

  apply(operations, actor, authorize) {
    if (!Array.isArray(operations) || !operations.length || operations.length > 1000) throw new DataError('Provide 1 to 1000 record operations.');
    this.transaction(() => {
      const state = this.load(), seen = new Set();
      for (const op of operations) {
        if (!op || !OPERATIONAL_ENTITIES.includes(op.entity) || typeof op.id !== 'string' || !Number.isInteger(op.version) || op.version < 0) throw new DataError('Invalid record operation.');
        const key = `${op.entity}:${op.id}`;
        if (seen.has(key)) throw new DataError('Duplicate record operation.'); seen.add(key);
        const row = this.db.prepare(`SELECT * FROM ${TABLES[op.entity]} WHERE id=?`).get(op.id);
        const version = row ? Number(row.version) : 0;
        if (version !== op.version || row?.deleted_at) throw new DataError('This record changed on another workstation. The latest data has been reloaded; review and reapply your change.',409,'STALE_RECORD');
        const previous = row ? JSON.parse(row.payload) : null;
        authorize(op,previous,state,operations);
        if (op.record === null) {
          if (!previous) throw new DataError('Record not found.',404);
          this.db.prepare(`UPDATE ${TABLES[op.entity]} SET deleted_at=?,version=version+1 WHERE id=?`).run(new Date().toISOString(),op.id);
        } else {
          if (op.record?.id !== op.id) throw new DataError('Record ID cannot change.');
          this.writeRecord(op.entity,op.record,row?.position ?? -Date.now());
        }
      }
      this.rebuildLinks();
      const event = { id: `audit-${crypto.randomUUID()}`, timestamp: new Date().toISOString(), actorId: actor.employeeId || actor.id, actorName: actor.name, actorRole: actor.userRole, action: 'OPERATION_COMMITTED', targetType: 'FLEET', details: operations.map(op => `${op.entity}/${op.id}: ${op.record===null?'deleted':op.version?'updated':'created'}`).join('; ') };
      this.writeRecord('auditLogs',event,-Date.now());
    });
    return this.load();
  }

  attachment(digest) { return this.db.prepare('SELECT * FROM attachments WHERE hash=?').get(digest); }
  attachmentOwners(digest) { return this.db.prepare('SELECT entity,id FROM attachment_links WHERE hash=?').all(digest); }
  close() { this.db.close(); }

  async backup(destination) {
    fs.mkdirSync(destination,{recursive:true,mode:0o700});
    const stamp = new Date().toISOString().replace(/[:.]/g,'-'), complete = path.join(destination,`fleet-backup-${stamp}-${crypto.randomUUID()}`), temporary=complete;
    fs.mkdirSync(temporary,{mode:0o700});
    await backup(this.db,path.join(temporary,'fleet.sqlite'));
    const check = new DatabaseSync(path.join(temporary,'fleet.sqlite'),{readOnly:true});
    try {
      if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || check.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup integrity verification failed.');
      fs.mkdirSync(path.join(temporary,'attachments'));
      for (const row of check.prepare('SELECT hash FROM attachments').all()) {
        const source = path.join(this.attachmentDirectory,row.hash), target = path.join(temporary,'attachments',row.hash);
        fs.copyFileSync(source,target);
        if (hash(fs.readFileSync(target)) !== row.hash) throw new Error('Backup attachment verification failed.');
      }
    } finally { check.close(); }
    fs.writeFileSync(path.join(temporary,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),schemaVersion:1},null,2));
    return complete;
  }
}

// Sessions/revocations survive restart; socket handles remain process-local.
export class PersistentMap extends Map {
  constructor(store,scope) {
    super(); this.store=store; this.scope=scope;
    for (const row of store.db.prepare('SELECT key,payload FROM security_state WHERE scope=?').all(scope)) super.set(row.key,JSON.parse(row.payload));
  }
  set(key,value) { this.store.db.prepare('INSERT INTO security_state VALUES(?,?,?) ON CONFLICT(scope,key) DO UPDATE SET payload=excluded.payload').run(this.scope,key,JSON.stringify(value)); return super.set(key,value); }
  delete(key) { this.store.db.prepare('DELETE FROM security_state WHERE scope=? AND key=?').run(this.scope,key); return super.delete(key); }
  clear() { this.store.db.prepare('DELETE FROM security_state WHERE scope=?').run(this.scope); super.clear(); }
}
