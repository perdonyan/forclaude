import { classForRole } from './src/utils/accountIdentity.mjs';
import 'dotenv/config';
import express from 'express';
import { FleetStore, PersistentMap, DataError } from './server/database.mjs';
import { CONFIGURATION_NAME,createConfigurationBackup,listConfigurationBackups,exportConfigurationBackup,importConfigurationBackup,prepareConfigurationRestore,configurationPath } from './server/configuration-backups.mjs';
import { startBackups } from './server/backup.mjs';
import { listBackups, backupPath, exportBackup, importBackup, prepareRestore } from './server/admin-backups.mjs';
import { authenticateToken, authorizeOperation, projectState, canRead, roleOf, allowed } from './server/access.mjs';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { INITIAL_DRONE_DATA } from './src/data/droneFleetData.ts';
import { INITIAL_BATTERIES, INITIAL_ACCESSORIES } from './src/data/initialBatteryAndAccessoryData.ts';
import { INITIAL_STREAMING_DEVICES } from './src/data/initialStreamingDevicesData.ts';
import { INITIAL_CHECKOUTS, INITIAL_OFFICERS } from './src/data/initialCheckoutAndUserData.ts';
import { INITIAL_HANDOVER_FORMS } from './src/data/initialHandoverData.ts';
import { INITIAL_NOTIFICATIONS } from './src/data/initialNotificationData.ts';
import { INITIAL_INCIDENT_REPORTS } from './src/data/initialIncidentReportData.ts';
import { INITIAL_CONFISCATED_DRONES } from './src/data/initialConfiscatedDroneData.ts';
import {
  ActiveSession,
  DroneItem,
  BatteryItem,
  AccessoryItem,
  StreamingDeviceItem,
  CheckoutRecord,
  HandoverFormRecord,
  UserItem,
  UserGroup,
  NotificationMessage,
  IncidentReportRecord,
  ConfiscatedDroneReport,
  GroupPrivileges,
  DEFAULT_GROUP_PRIVILEGES,
  AuditLogEntry,
  getUserRole,
} from './src/types/drone.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'runtime-data'));
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR, 'backups'));
const CONFIGURATION_BACKUP_DIR=path.resolve(process.env.CONFIGURATION_BACKUP_DIR || path.join(BACKUP_DIR,'configuration'));
let adminBackupBusy = false;
const BACKUP_INTERVAL_MINUTES=Number(process.env.BACKUP_INTERVAL_MINUTES || 240);
const BACKUP_RETENTION_DAYS=Number(process.env.BACKUP_RETENTION_DAYS || 30);
const BACKUP_TIMEZONE=process.env.BACKUP_TIMEZONE || 'Asia/Riyadh';
const DATA_FILE = path.resolve(process.env.LEGACY_DATA_FILE || path.join(__dirname, 'data', 'fleet-data.json'));
fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

// JWT Secret Key (256-bit secure secret)
function loadJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('Set JWT_SECRET to a private random value of at least 32 characters.');
  const filename = path.join(DATA_DIR, 'jwt-secret');
  if (!fs.existsSync(filename)) fs.writeFileSync(filename, crypto.randomBytes(48).toString('hex'), { mode: 0o600, flag: 'wx' });
  return fs.readFileSync(filename, 'utf8').trim();
}
const JWT_SECRET = loadJwtSecret();
// JWT Token Expiration: Strictly <= 24 hours
const JWT_EXPIRATION = '24h';
const JWT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Password Reset Link Expiration: 30 minutes (Strictly <= 1 hour)
const PASSWORD_RESET_EXPIRATION_MS = 30 * 60 * 1000;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Global In-Memory Authoritative State
interface FleetDataState {
  drones: DroneItem[];
  batteries: BatteryItem[];
  accessories: AccessoryItem[];
  streamingDevices: StreamingDeviceItem[];
  checkouts: CheckoutRecord[];
  handoverForms: HandoverFormRecord[];
  incidentReports: IncidentReportRecord[];
  confiscatedDrones: ConfiscatedDroneReport[];
  users: UserItem[];
  notifications: NotificationMessage[];
  groupPrivileges: GroupPrivileges;
  userGroups?: UserGroup[];
  auditLogs: AuditLogEntry[];
}

function getInitialState(): FleetDataState {
  return {
    drones: INITIAL_DRONE_DATA,
    batteries: INITIAL_BATTERIES,
    accessories: INITIAL_ACCESSORIES,
    streamingDevices: INITIAL_STREAMING_DEVICES,
    checkouts: INITIAL_CHECKOUTS,
    handoverForms: INITIAL_HANDOVER_FORMS,
    incidentReports: INITIAL_INCIDENT_REPORTS,
    confiscatedDrones: INITIAL_CONFISCATED_DRONES,
    users: INITIAL_OFFICERS.map((u) => {
      const isAdmin = getUserRole(u) === 'ADMIN';
      return {
        ...u,
        accountStatus: 'ACTIVE',
        mustChangePassword: !isAdmin,
        requiresPasswordSetup: !isAdmin,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),
    notifications: INITIAL_NOTIFICATIONS,
    groupPrivileges: DEFAULT_GROUP_PRIVILEGES,
    auditLogs: [
      {
        id: `audit-${Date.now()}-boot`,
        timestamp: new Date().toISOString(),
        actorId: 'adm-1001',
        actorName: 'System Administrator (Initial Setup)',
        actorRole: 'ADMIN',
        action: 'SYSTEM_BOOT',
        targetType: 'SYSTEM',
        details: 'Local Network Airfield Server initialized with secure RBAC, password security & audit logging',
      },
    ],
  };
}

const store = new FleetStore(DATA_DIR);
const seed = getInitialState();
if (process.env.NODE_ENV === 'production' && !fs.existsSync(DATA_FILE)) {
  for (const entity of ['drones','batteries','accessories','streamingDevices','checkouts','handoverForms','incidentReports','confiscatedDrones','notifications']) (seed as any)[entity] = [];
  seed.users = seed.users.filter(u => getUserRole(u) === 'ADMIN');
}
let fleetState = store.initialize(DATA_FILE, seed) as FleetDataState;
function persistFleetState() {
  try { fleetState = store.save(fleetState) as FleetDataState; }
  catch (error) { fleetState = store.load() as FleetDataState; throw error; }
}

// Rename existing seeded streamers without overwriting later custom names.
const streamingDeviceNameUpdates: Record<string, { previousName: string; name: string }> = {
  'stream-1': { previousName: "LiveU LU300S 5G Multi-Cam Field Encoder", name: 'TX01' },
  'stream-2': { previousName: "DJI Cellular Transmission Dongle 2 (4G/LTE)", name: 'TX02' },
  'stream-3': { previousName: "Teradek Prism Flex 4K H.264/HEVC Encoder", name: 'TX03' },
  'stream-4': { previousName: "Haivision Makito X4 Ultra-Low Latency SDI Encoder", name: 'TX04' },
  'stream-5': { previousName: "DJI Cellular Transmission Dongle 2 (4G/LTE)", name: 'TX05' },
  'stream-6': { previousName: "Kiloview E1 NDI/RTMP Video Encoder", name: 'TX06' },
  'stream-7': { previousName: "Accsoon CineEye 2S Pro Wireless Transmitter & Receiver", name: 'TX07' },
  'stream-8': { previousName: "LiveU Solo HDMI Cellular Encoder", name: 'TX08' },
};
let streamingDeviceNamesChanged = false;
for (const device of fleetState.streamingDevices) {
  const update = streamingDeviceNameUpdates[device.id];
  if (update && device.deviceName === update.previousName) {
    device.deviceName = update.name;
    streamingDeviceNamesChanged = true;
  }
}
if (streamingDeviceNamesChanged) {
  persistFleetState();
}

// Security: User Sanitizer - Never leak passwordHash or plain credentials to client
function sanitizeUser(user: UserItem): Omit<UserItem, 'passwordHash'> {
  const { passwordHash: _, ...safeUser } = user;
  return {...safeUser,canApproveRequests:allowed(user,fleetState,'APPROVE_REQUESTS') && !user.archivedAt && user.accountStatus!=='SUSPENDED'};
}

function getSanitizedUsers(): Array<Omit<UserItem, 'passwordHash'>> {
  return fleetState.users.filter(u=>!(u as any).archivedAt).map(sanitizeUser);
}

// 1. Password Storage Security & Reset:
// - Eliminate security flaw: Never take passwords from mobile numbers.
// - Retain the password for the admin group (cost factor 12 >= 10).
// - Existing password hashes survive restarts; setup applies only to uninitialized accounts.
async function initializeUserHashes() {
  let updated = false;
  for (const u of fleetState.users) {
    u.userRole = getUserRole(u);
    if (u.passwordHash) {
      if (u.userRole === 'ADMIN' && !u.lastPasswordChange && !u.mustChangePassword) { u.mustChangePassword = true; updated = true; }
      continue;
    }
    if (u.userRole === 'ADMIN') {
      let password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (!password) {
        if (process.env.NODE_ENV === 'production') throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD for the first administrator login.');
        password = crypto.randomBytes(18).toString('base64url');
        fs.writeFileSync(path.join(DATA_DIR, 'admin-bootstrap.txt'), password, { mode: 0o600 });
        console.log('[Setup] First administrator password is in the private runtime-data/admin-bootstrap.txt file.');
      }
      if (password.length < 12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
      u.passwordHash = await bcrypt.hash(password, 12);
      u.requiresPasswordSetup = false;
      u.mustChangePassword = true;
    } else { u.requiresPasswordSetup = true; u.mustChangePassword = true; }
    updated = true;
  }
  if (updated) persistFleetState();
}

// 2. Session Revocation Store: Invalidate JWT session tokens upon logout
// Key: JWT token or JTI / SessionId -> revocation timestamp
const revokedTokens = new PersistentMap(store, 'revokedTokens') as Map<string, number>;

function isTokenRevoked(token: string): boolean {
  if (!token) return true;
  return revokedTokens.has(crypto.createHash('sha256').update(token).digest('hex'));
}

function revokeToken(token: string) {
  if (token) {
    revokedTokens.set(crypto.createHash('sha256').update(token).digest('hex'), Date.now());
  }
}

// Sweep revoked tokens older than 24 hours periodically
setInterval(() => {
  const cutoff = Date.now() - JWT_MAX_AGE_MS;
  for (const [token, timestamp] of revokedTokens.entries()) {
    if (timestamp < cutoff) {
      revokedTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

// 3. Password Reset Store: Tokens strictly expire within 30 minutes (<= 1 hour)
interface PasswordResetRecord {
  token: string;
  userId: string;
  employeeId: string;
  email: string;
  createdAt: number;
  expiresAt: number; // Max 30 minutes <= 1 hour
  used: boolean;
}
const passwordResetTokens = new Map<string, PasswordResetRecord>();

// 3.1. Admin-Only Password Reset Requests Store
interface PasswordResetRequest {
  id: string;
  userId?: string;
  employeeId: string;
  name?: string;
  department?: string;
  requestedAt: string;
  notes?: string;
  status: 'PENDING' | 'RESOLVED';
  ipAddress?: string;
}
const passwordResetRequests = new PersistentMap(store, 'passwordResetRequests') as Map<string, PasswordResetRequest>;

// Clean expired password reset tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of passwordResetTokens.entries()) {
    if (now > record.expiresAt || record.used) {
      passwordResetTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// 4. Anti-CSRF Token Store
const validCsrfTokens = new Map<string, number>(); // token -> expiresAt (2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of validCsrfTokens.entries()) {
    if (now > expiresAt) {
      validCsrfTokens.delete(token);
    }
  }
}, 10 * 60 * 1000);

function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  validCsrfTokens.set(token, Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  return token;
}

function isValidCsrfToken(token?: string | null): boolean {
  if (!token) return false;
  const expiresAt = validCsrfTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    validCsrfTokens.delete(token);
    return false;
  }
  return true;
}

// Single-Instance Active User Sessions on Local Network
const activeSessions = new PersistentMap(store, 'activeSessions') as Map<string, ActiveSession>;
const sessionSockets = new Map<string, WebSocket>();
const socketToSession = new Map<WebSocket, string>();
const socketTokens = new Map<WebSocket, string>();

function getActiveSessionsList(): ActiveSession[] {
  return Array.from(activeSessions.values());
}

// Express App & HTTP Server
const app = express();
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
for (const method of ['get','post','put','patch','delete']) {
  const original = (app as any)[method].bind(app);
  (app as any)[method] = (...args: any[]) => original(...args.map(arg => typeof arg === 'function' ? (req: any, res: any, next: any) => {
    try { Promise.resolve(arg(req,res,next)).catch(next); } catch (error) { next(error); }
  } : arg));
}
app.use(express.json({ limit: '50mb' }));

// Anti-CSRF Origin & Host Validation Middleware
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers['origin'];
    const host = (req.headers['x-forwarded-host'] as string) || req.headers['host'];

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const originHost = originUrl.host.toLowerCase();
        const primaryHost = host.split(',')[0].trim().toLowerCase();

        const configuredOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
        const codespaceOrigin = process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
          ? `https://${process.env.CODESPACE_NAME}-${PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}` : '';
        const isAllowed = originHost === (req.headers.host || '').toLowerCase() || configuredOrigins.includes(originUrl.origin) || originUrl.origin === codespaceOrigin;

        if (!isAllowed) {
          return res.status(400).json({ error: 'Cross-origin request rejected (CSRF protection).' });
        }
      } catch {
        return res.status(400).json({ error: 'Malformed Origin header.' });
      }
    }
  }
  next();
});

// CSRF Token Validation Middleware for state-changing forms
function requireCsrfToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const csrfToken = (req.headers['x-csrf-token'] as string) || (req.body && req.body._csrf);
  if (!isValidCsrfToken(csrfToken)) {
    return res.status(400).json({
      error: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      code: 'CSRF_INVALID',
    });
  }
  next();
}

// 5. Rate Limiting on Login Endpoint (Max 10 attempts per 15 minutes, tracking both IP and User Account)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const loginRateLimits = new PersistentMap(store, 'loginRateLimits') as Map<string, RateLimitRecord>;

function getClientIp(req: express.Request): string {
  const forwarded = process.env.TRUST_PROXY === '1' ? req.headers['x-forwarded-for'] : undefined;
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function loginRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = getClientIp(req);
  const employeeId = req.body?.employeeId ? String(req.body.employeeId).trim().toLowerCase() : '';
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
  const MAX_ATTEMPTS = 10;

  const keys = [`ip:${ip}`];
  if (employeeId) {
    keys.push(`user:${employeeId}`);
  }

  for (const key of keys) {
    const record = loginRateLimits.get(key);
    if (record && now <= record.resetAt && record.count >= MAX_ATTEMPTS) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: `Too many login attempts. For security reasons, please wait ${retryAfterSec} seconds before retrying.`,
        retryAfter: retryAfterSec,
      });
    }
  }

  // Increment attempt on check
  for (const key of keys) {
    const record = loginRateLimits.get(key);
    if (!record || now > record.resetAt) {
      loginRateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      record.count += 1;
      loginRateLimits.set(key, record);
    }
  }

  next();
}

function resetLoginRateLimit(ip: string, employeeId?: string) {
  loginRateLimits.delete(`ip:${ip}`);
  if (employeeId) {
    loginRateLimits.delete(`user:${employeeId.toLowerCase()}`);
  }
}

// JWT Authentication Middleware for Protected Endpoints
function readAuthenticatedUser(token: string) {
  return authenticateToken(token, (value: string) => jwt.verify(value, JWT_SECRET), fleetState, activeSessions, isTokenRevoked);
}
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  const cookieToken = req.path.startsWith('/api/attachments/') || req.path.startsWith('/attachments/')
    ? req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('fleet_session='))?.slice('fleet_session='.length) : undefined;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
  try {
    const user = readAuthenticatedUser(token || '');
    if (user.mustChangePassword && ['POST','PUT','PATCH','DELETE'].includes(req.method) && !['/api/auth/change-password','/api/auth/logout'].includes(req.path)) return res.status(403).json({error:'Change your temporary password before making operational changes.'});
    (req as any).user = { ...sanitizeUser(user as UserItem), userId: user.userId, sessionId: user.sessionId, userRole: user.userRole };
    next();
  } catch (error: any) { res.status(error.status || 401).json({ error: error.message, code: error.code }); }
}
function setAttachmentCookie(req: express.Request, res: express.Response, token: string) {
  res.cookie('fleet_session', token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: JWT_MAX_AGE_MS, path: '/api/attachments' });
}
function stateFor(user: any) {
  return { ...projectState(user, fleetState, store.versions()), authenticatedUser: sanitizeUser(user), activeSessions: roleOf(user) === 'ADMIN' ? getActiveSessionsList() : [] };
}

// Role-Based Access Control Guard
function requireRole(...roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const currentRole = roleOf(user);
    if (!roles.includes(currentRole)) {
      return res.status(403).json({
        error: `Access denied. Action requires one of: [${roles.join(', ')}] roles.`,
        code: 'FORBIDDEN_ROLE',
      });
    }
    next();
  };
}

// Automatic Inactivity Session Sweep (Max 8 Hours Idle)
const MAX_SESSION_IDLE_MS = 8 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  let revokedAny = false;

  for (const [sId, sess] of activeSessions.entries()) {
    const lastActive = new Date(sess.lastActiveTime).getTime();
    if (now - lastActive > MAX_SESSION_IDLE_MS) {
      console.log(`[Security] Session ${sId} (${sess.name}) expired due to 8 hours inactivity.`);
      const oldWs = sessionSockets.get(sId);
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        try {
          oldWs.send(
            JSON.stringify({
              type: 'FORCE_SIGNOUT',
              targetSessionId: sId,
              reason: 'Your session has expired due to 8 hours of inactivity. Please sign in again.',
              timestamp: new Date().toISOString(),
            })
          );
        } catch {}
      }
      activeSessions.delete(sId);
      sessionSockets.delete(sId);
      revokedAny = true;
    }
  }

  if (revokedAny) {
    broadcastActiveSessions();
  }
}, 60 * 1000);

const server = http.createServer(app);

// WebSocket Server attached to HTTP Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost';
  const pathname = new URL(request.url || '', `http://${host}`).pathname;
  if (pathname === '/api/ws' || pathname === '/ws') {
    const origin = request.headers.origin;
    if (origin) {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(v=>v.trim());
      const codespaceOrigin = process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ? `https://${process.env.CODESPACE_NAME}-${PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}` : '';
      try { if (new URL(origin).host !== host && !allowedOrigins.includes(origin) && origin !== codespaceOrigin) { socket.destroy(); return; } } catch { socket.destroy(); return; }
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else { socket.destroy(); }
});

// Broadcast Helper
function broadcast(payload: any, excludeWs?: WebSocket) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN || client === excludeWs) continue;
    const token = socketTokens.get(client);
    if (!socketToSession.has(client) || !token) continue;
    try {
      const user = readAuthenticatedUser(token);
      if (payload.type === 'ACTIVE_SESSIONS_UPDATED' && roleOf(user) !== 'ADMIN') continue;
      if (payload.entity && !canRead(user,fleetState,payload.entity)) continue;
      if (payload.entity==='users' || payload.entity==='notifications') payload={...payload,data:projectState(user,fleetState,store.versions())[payload.entity]};
      const outgoing = payload.type === 'GROUP_PRIVILEGES_UPDATED' && roleOf(user) !== 'ADMIN' ? { ...payload, groupPrivileges: projectState(user,fleetState,store.versions()).groupPrivileges }
        : payload.type === 'FULL_RESET' ? { ...payload, state: stateFor(user) }
        : payload.entity ? { ...payload, versions: store.versions()[payload.entity] } : payload;
      client.send(JSON.stringify(outgoing));
    } catch { client.close(4001,'Sign in required'); }
  }
}

// Broadcast Active Sessions
function broadcastActiveSessions() {
  broadcast({
    type: 'ACTIVE_SESSIONS_UPDATED',
    activeSessions: getActiveSessionsList(),
  });
}

// Broadcast Specific Entity Update
function broadcastEntityUpdate(entity: keyof FleetDataState, data: any, sourceSessionId?: string) {
  broadcast({
    type: 'SYNC_UPDATE',
    entity,
    data,
    sourceSessionId,
  });
}

// Authoritative Audit Trail Logger
function addAuditLog(
  actor: { id: string; name: string; role?: string; employeeId?: string },
  action: string,
  targetType: AuditLogEntry['targetType'],
  details: string,
  ipAddress?: string,
  targetId?: string
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    actorId: actor.employeeId || actor.id,
    actorName: actor.name,
    actorRole: actor.role || 'OFFICER',
    action,
    targetType,
    targetId,
    details,
    ipAddress,
  };
  fleetState.auditLogs = [entry, ...(fleetState.auditLogs || [])];
  persistFleetState();
  broadcast({
    type: 'SYNC_UPDATE',
    entity: 'auditLogs',
    data: fleetState.auditLogs,
  });
  return entry;
}

// Single-Instance Enforcement: Revoke previous session if user already signed in
function enforceSingleInstanceLogin(
  user: UserItem,
  newSessionId: string,
  ipAddress: string,
  deviceInfo: string
): { previousSessionRevoked: boolean; revokedSession?: ActiveSession } {
  let previousSessionRevoked = false;
  let revokedSession: ActiveSession | undefined;

  for (const [existingSessId, session] of activeSessions.entries()) {
    if (
      existingSessId !== newSessionId &&
      (session.employeeId === user.employeeId || session.userId === user.id)
    ) {
      console.log(`[Auth] User ${user.employeeId} (${user.name}) logged in on new device (${ipAddress}). Terminating previous session ${existingSessId}.`);
      
      previousSessionRevoked = true;
      revokedSession = { ...session };

      const oldWs = sessionSockets.get(existingSessId);
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        try {
          oldWs.send(
            JSON.stringify({
              type: 'FORCE_SIGNOUT',
              targetSessionId: existingSessId,
              reason: 'Your account was signed in from another device on the local network. Only a single active session is permitted.',
              newDevice: deviceInfo || 'Another Workstation',
              newIp: ipAddress,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.error('[Auth] Failed to send FORCE_SIGNOUT to previous socket:', e);
        }
      }

      activeSessions.delete(existingSessId);
      sessionSockets.delete(existingSessId);
    }
  }

  // Register new active session
  const newSession: ActiveSession = {
    sessionId: newSessionId,
    userId: user.id,
    employeeId: user.employeeId,
    name: user.name,
    rank: user.rank,
    userClass: user.userClass || 'OFFICER',
    department: user.department,
    ipAddress,
    deviceInfo: deviceInfo || 'Local Client',
    loginTime: new Date().toISOString(),
    lastActiveTime: new Date().toISOString(),
  };

  activeSessions.set(newSessionId, newSession);
  broadcastActiveSessions();

  return { previousSessionRevoked, revokedSession };
}

// WebSocket Connection Management
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  console.log(`[WebSocket] Client connected from ${clientIp}. Total clients: ${wss.clients.size}`);

  const identifyTimeout = setTimeout(() => { if (!socketToSession.has(ws)) ws.close(4001,'Sign in required'); }, 10000);
  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      const { type, sessionId, token } = message;
      if (type === 'IDENTIFY_SESSION') {
        const user = readAuthenticatedUser(token || '');
        if (sessionId !== user.sessionId) throw new DataError('Session identifier mismatch.',401);
        const previousSession = socketToSession.get(ws);
        if (previousSession && previousSession !== user.sessionId && sessionSockets.get(previousSession) === ws) sessionSockets.delete(previousSession);
        socketToSession.set(ws, user.sessionId);
        socketTokens.set(ws,token);
        sessionSockets.set(user.sessionId,ws);
        const session = activeSessions.get(user.sessionId)!;
        session.lastActiveTime = new Date().toISOString();
        activeSessions.set(user.sessionId,session);
        clearTimeout(identifyTimeout);
        ws.send(JSON.stringify({type:'INIT_STATE',state:stateFor(user)}));
        broadcastActiveSessions();
        return;
      }
      const user = readAuthenticatedUser(socketTokens.get(ws) || '');
      if (sessionId && sessionId !== user.sessionId) throw new DataError('Session identifier mismatch.',401);
      switch (type) {
        case 'MUTATE':
        case 'KICK_USER':
          ws.send(JSON.stringify({type:'ERROR',error:'Use authenticated HTTP operations for changes.'}));
          break;
        case 'LOGOUT':
          revokeToken(socketTokens.get(ws)!);
          activeSessions.delete(user.sessionId);
          sessionSockets.delete(user.sessionId);
          socketToSession.delete(ws);
          socketTokens.delete(ws);
          broadcastActiveSessions();
          ws.close();
          break;
        case 'PING': {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          if (sessionId) {
            const sess = activeSessions.get(sessionId);
            if (sess) { sess.lastActiveTime = new Date().toISOString(); activeSessions.set(sessionId,sess); }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      ws.send(JSON.stringify({type:'ERROR',error:'Sign in required or invalid request.'}));
      if (!socketTokens.get(ws)) ws.close(4001,'Sign in required');
    }
  });

  ws.on('close', () => {
    clearTimeout(identifyTimeout);
    socketTokens.delete(ws);
    const sessId = socketToSession.get(ws);
    if (sessId) {
      socketToSession.delete(ws);
      if (sessionSockets.get(sessId) === ws) {
        sessionSockets.delete(sessId);
      }
    }
    console.log(`[WebSocket] Client disconnected. Total clients: ${wss.clients.size}`);
  });
});

// REST API Endpoints

// 0. CSRF Token Endpoint (Forms fetch before submitting login or sensitive actions)
app.get('/api/auth/csrf-token', (_req, res) => {
  const token = generateCsrfToken();
  res.json({ csrfToken: token });
});


function backupConfiguration() {
  return {schemaVersion:1,PORT,DATA_DIR,BACKUP_DIR,CONFIGURATION_BACKUP_DIR,LEGACY_DATA_FILE:DATA_FILE,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS || '',GEMINI_API_KEY:process.env.GEMINI_API_KEY || '',NODE_ENV:process.env.NODE_ENV || 'development',JWT_SECRET,TRUST_PROXY:process.env.TRUST_PROXY || '0',BACKUP_INTERVAL_MINUTES:String(BACKUP_INTERVAL_MINUTES),BACKUP_RETENTION_DAYS:String(BACKUP_RETENTION_DAYS),BACKUP_TIMEZONE};
}
function backupAudit(req: express.Request, action: string, details: string) {
  const actor=(req as any).user;
  addAuditLog({...actor,role:roleOf(actor)},action,'SYSTEM',details,getClientIp(req));
}
app.get('/api/admin/backups', requireAuth, requireRole('ADMIN'), (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if(req.query.type && !['database','configuration'].includes(String(req.query.type))) return res.status(400).json({error:'Choose Database or Configuration backup.'});
  const configuration=req.query.type==='configuration';
  res.json({backupType:configuration?'configuration':'database',backups:configuration?listConfigurationBackups(CONFIGURATION_BACKUP_DIR):listBackups(BACKUP_DIR),configurationOnChange:true,intervalMinutes:BACKUP_INTERVAL_MINUTES,retentionDays:BACKUP_RETENTION_DAYS,dailyBackup:true,dailyTime:'00:00',timeZone:BACKUP_TIMEZONE});
});
app.post('/api/admin/backups', requireCsrfToken, requireAuth, requireRole('ADMIN'), async (req,res) => {
  if(adminBackupBusy) return res.status(409).json({error:'A backup or restore is already running.'});
  adminBackupBusy=true;
  try {
    const type=req.body.type || 'database';
    if(!['database','configuration'].includes(type)) return res.status(400).json({error:'Choose Database or Configuration backup.'});
    backupAudit(req,'BACKUP_CREATED','Administrator requested a separate '+type+' backup.');
    const directory=type==='configuration'?createConfigurationBackup(CONFIGURATION_BACKUP_DIR,backupConfiguration()):await store.backup(BACKUP_DIR);
    res.json({name:path.basename(directory),backupType:type});
  } catch(error:any) { res.status(500).json({error:error.message || 'Backup failed.'}); }
  finally { adminBackupBusy=false; }
});
app.get('/api/admin/backups/:name/download', requireAuth, requireRole('ADMIN'), (req,res) => {
  try {
    const buffer=CONFIGURATION_NAME.test(req.params.name)?exportConfigurationBackup(CONFIGURATION_BACKUP_DIR,req.params.name):exportBackup(BACKUP_DIR,req.params.name);
    backupAudit(req,'BACKUP_DOWNLOADED','Administrator downloaded backup '+req.params.name);
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Disposition','attachment; filename="'+req.params.name+'.fleet.gz"');
    res.type('application/octet-stream').send(buffer);
  } catch(error:any) { res.status(400).json({error:error.message || 'Download failed.'}); }
});
app.post('/api/admin/backups/upload', requireCsrfToken, requireAuth, requireRole('ADMIN'), express.raw({type:'application/octet-stream',limit:'96mb',inflate:false}), (req,res) => {
  if(adminBackupBusy) return res.status(409).json({error:'A backup or restore is already running.'});
  adminBackupBusy=true;
  try {
    if(!Buffer.isBuffer(req.body)) return res.status(400).json({error:'Choose a .fleet.gz backup file.'});
    if(req.query.type && !['database','configuration'].includes(String(req.query.type))) return res.status(400).json({error:'Choose Database or Configuration backup.'});
    const name=req.query.type==='configuration'?importConfigurationBackup(CONFIGURATION_BACKUP_DIR,req.body):importBackup(BACKUP_DIR,req.body);
    backupAudit(req,'BACKUP_IMPORTED','Administrator imported verified backup '+name);
    res.json({name});
  } catch(error:any) { res.status(400).json({error:error.message || 'Invalid backup.'}); }
  finally { adminBackupBusy=false; }
});
app.post('/api/admin/backups/:name/restore', requireCsrfToken, requireAuth, requireRole('ADMIN'), async (req,res) => {
  if(req.body.confirmation!=='RESTORE') return res.status(400).json({error:'Type RESTORE to confirm.'});
  if(adminBackupBusy) return res.status(409).json({error:'A backup or restore is already running.'});
  adminBackupBusy=true;
  try {
    if(CONFIGURATION_NAME.test(req.params.name)) {
      configurationPath(CONFIGURATION_BACKUP_DIR,req.params.name);
      createConfigurationBackup(CONFIGURATION_BACKUP_DIR,backupConfiguration());
      const directory=prepareConfigurationRestore(CONFIGURATION_BACKUP_DIR,req.params.name,DATA_DIR);
      backupAudit(req,'CONFIGURATION_RESTORE_PREPARED','Configuration staged at '+directory+'; live settings unchanged.');
      return res.json({directory,backupType:'configuration',configurationFile:path.join(directory,'configuration.json'),message:'Configuration verified and prepared separately. Review configuration.json, apply the appropriate values to the server .env, and restart. Keep this host’s correct data and backup paths. The database and attached documents are unchanged.'});
    }
    backupPath(BACKUP_DIR,req.params.name);
    await store.backup(BACKUP_DIR);
    createConfigurationBackup(CONFIGURATION_BACKUP_DIR,backupConfiguration());
    const directory=prepareRestore(BACKUP_DIR,req.params.name,DATA_DIR);
    backupAudit(req,'RESTORE_PREPARED','Verified restore prepared at '+directory+'; live database unchanged.');
    res.json({directory,message:'Restore verified and prepared. Stop the server, set DATA_DIR to this directory in your server configuration, then restart. All users must sign in again. Restore server settings separately from the Configuration tab if needed; older combined backups may also contain configuration.json.'});
  } catch(error:any) { res.status(400).json({error:error.message || 'Restore failed.'}); }
  finally { adminBackupBusy=false; }
});

// Authenticated state and versioned, transactional record operations.
app.get('/api/fleet/state', requireAuth, (req,res) => res.json(stateFor((req as any).user)));
app.post('/api/fleet/mutate', requireCsrfToken, requireAuth, (req,res) => {
  const actor = (req as any).user;
  fleetState = store.apply(req.body.operations,actor,(op: any,previous: any,state: any,operations: any[]) => authorizeOperation(actor,op,previous,state,operations)) as FleetDataState;
  const changed = new Set<string>(req.body.operations.map((op: any)=>op.entity));
  for (const entity of changed) broadcastEntityUpdate(entity as keyof FleetDataState,(fleetState as any)[entity]);
  broadcastEntityUpdate('auditLogs',fleetState.auditLogs);
  res.json({success:true,state:stateFor(actor)});
});
app.post('/api/fleet/reset', requireCsrfToken, requireAuth, requireRole('ADMIN'), (_req,res) => res.status(409).json({error:'Factory reset is disabled. Restore a verified backup into a new runtime directory.'}));
app.get('/api/attachments/:hash', requireAuth, (req,res) => {
  const digest = req.params.hash;
  if (!/^[a-f0-9]{64}$/.test(digest)) return res.sendStatus(404);
  const attachment = store.attachment(digest);
  const actor = (req as any).user;
  if (!attachment || !store.attachmentOwners(digest).some((owner: any) => canRead(actor,fleetState,owner.entity))) return res.sendStatus(404);
  res.setHeader('Content-Type',String(attachment.mime_type));
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:");
  res.setHeader('Cache-Control','private, no-store');
  res.sendFile(path.join(store.attachmentDirectory,digest));
});

// 4. Secure User Sign-In with:
// - CSRF Protection (requireCsrfToken)
// - Rate Limiting (loginRateLimiter: max 10 attempts per 15 mins by IP and EmployeeID)
// - Account status checks (SUSPENDED accounts rejected)
// - Account lockout protection (10 consecutive failed attempts lock account for 15 mins)
// - Salted bcrypt password verification with cost factor >= 10
// - JWT token generation with expiration <= 24 hours
// - Single-Instance enforcement
// - Audit Trail logging
app.post('/api/auth/login', requireCsrfToken, loginRateLimiter, async (req, res) => {
  const { employeeId, password, sessionId, deviceInfo } = req.body;
  const clientIp = getClientIp(req);

  if (!employeeId || !sessionId) {
    return res.status(400).json({ error: 'Missing Employee ID or session identifier' });
  }

  const cleanEmpId = String(employeeId).trim().toLowerCase();
  const cleanPass = password !== undefined ? String(password).trim() : '';

  // Locate user in authoritative server directory
  const targetUser = fleetState.users.find(
    (u) =>
      u.employeeId.trim().toLowerCase() === cleanEmpId ||
      u.id.toLowerCase() === cleanEmpId
  );

  if (!targetUser) {
    return res.status(401).json({ error: 'Invalid Employee ID or credentials.' });
  }

  // 1. Account Status Enforcement: Suspended accounts cannot sign in
  if (targetUser.accountStatus === 'SUSPENDED' || (targetUser as any).identityConflict || (targetUser as any).archivedAt) {
    addAuditLog(
      { id: targetUser.id, name: targetUser.name, role: targetUser.userRole, employeeId: targetUser.employeeId },
      'LOGIN_BLOCKED',
      'SECURITY',
      `Blocked login attempt for suspended personnel account (${targetUser.employeeId})`,
      clientIp
    );
    return res.status(403).json({
      error: 'This account has been suspended by an administrator. Please contact your system admin.',
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  // 2. Account Lockout Check (15 minutes after 10 failed attempts)
  if (targetUser.lockedUntil && new Date(targetUser.lockedUntil).getTime() > Date.now()) {
    const remainingSec = Math.ceil((new Date(targetUser.lockedUntil).getTime() - Date.now()) / 1000);
    return res.status(423).json({
      error: `Account is temporarily locked due to multiple failed login attempts. Please wait ${remainingSec} seconds before retrying.`,
      code: 'ACCOUNT_LOCKED',
      retryAfter: remainingSec,
    });
  }

  // 3. Initial Login Check: Users create their own password during initial login
  if (targetUser.requiresPasswordSetup || !targetUser.passwordHash) {
    return res.status(200).json({
      success: false,
      initialSetupRequired: true,
      employeeId: targetUser.employeeId,
      message: 'Initial login detected. Your password must be created before signing in. Please create your secure personal password.',
    });
  }

  // Strict Password Verification using bcrypt (cost factor >= 10)
  // Security Policy: Never accept mobile number as password
  let isMatch = false;
  if (targetUser.passwordHash) {
    isMatch = await bcrypt.compare(cleanPass, targetUser.passwordHash);
  }

  if (!isMatch) {
    targetUser.failedLoginAttempts = (targetUser.failedLoginAttempts || 0) + 1;
    if (targetUser.failedLoginAttempts >= 10) {
      targetUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      addAuditLog(
        { id: targetUser.id, name: targetUser.name, role: targetUser.userRole, employeeId: targetUser.employeeId },
        'ACCOUNT_LOCKED',
        'SECURITY',
        `Account locked for 15 minutes after 10 failed login attempts (${targetUser.employeeId})`,
        clientIp
      );
    } else {
      addAuditLog(
        { id: targetUser.id, name: targetUser.name, role: targetUser.userRole, employeeId: targetUser.employeeId },
        'LOGIN_FAILED',
        'SECURITY',
        `Failed password attempt (${targetUser.failedLoginAttempts}/10) for ${targetUser.employeeId}`,
        clientIp
      );
    }
    persistFleetState();
    return res.status(401).json({ error: 'Invalid Employee ID or Password. Verification failed.' });
  }

  // On successful authentication, clear failed attempts and lockout
  targetUser.failedLoginAttempts = 0;
  targetUser.lockedUntil = null;
  persistFleetState();

  // Reset rate limit on successful authentication
  resetLoginRateLimit(clientIp, targetUser.employeeId);

  // Enforce single-instance session
  const result = enforceSingleInstanceLogin(targetUser, sessionId, clientIp, deviceInfo);

  // Generate signed JWT Token with explicit <= 24 hour expiration
  const tokenPayload = {
    sessionId,
    userId: targetUser.id,
    employeeId: targetUser.employeeId,
    name: targetUser.name,
    userClass: targetUser.userClass,
    userRole: targetUser.userRole || getUserRole(targetUser),
    department: targetUser.department,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION, jwtid: crypto.randomUUID() });
  setAttachmentCookie(req,res,token);

  // Add audit log for successful login
  addAuditLog(
    { id: targetUser.id, name: targetUser.name, role: targetUser.userRole, employeeId: targetUser.employeeId },
    'LOGIN_SUCCESS',
    'AUTH',
    `Personnel signed in successfully (${deviceInfo || 'Workstation'})`,
    clientIp
  );

  // Return sanitized user object (never return passwordHash)
  const safeUser = sanitizeUser(targetUser);

  res.json({
    success: true,
    token, // Cryptographic JWT token (expires in 24 hours)
    tokenExpiresIn: '24h',
    user: safeUser,
    mustChangePassword: !!targetUser.mustChangePassword,
    session: activeSessions.get(sessionId),
    previousSessionRevoked: result.previousSessionRevoked,
    revokedSession: result.revokedSession,
    activeSessions: roleOf(targetUser) === 'ADMIN' ? getActiveSessionsList() : [],
  });
});

// 4.1. Initial Login Setup: Users create their own personal password during initial login
app.post('/api/auth/initial-password-setup', requireCsrfToken, loginRateLimiter, async (req, res) => {
  const { employeeId, newPassword, qatarId, sessionId, deviceInfo } = req.body;
  const clientIp = getClientIp(req);

  if (!employeeId || !newPassword || !qatarId) {
    return res.status(400).json({ error: 'Employee ID, Qatar ID and new password are required.' });
  }

  const cleanEmpId = String(employeeId).trim().toLowerCase();
  const cleanPass = String(newPassword).trim();

  if (cleanPass.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const targetUser = fleetState.users.find(
    (u) => u.employeeId.toLowerCase() === cleanEmpId || u.id.toLowerCase() === cleanEmpId
  );

  if (!targetUser) {
    return res.status(401).json({ error: 'Employee ID or identity verification failed.' });
  }

  if (targetUser.accountStatus === 'SUSPENDED') {
    return res.status(403).json({ error: 'This account has been suspended by an administrator. Please contact your system admin.' });
  }

  // If Qatar ID was provided for identity confirmation, verify it matches
  if (String(qatarId).trim() !== targetUser.qatarId) {
    return res.status(401).json({ error: 'Qatar ID verification failed. Please verify your identity details.' });
  }

  // Prevent overwriting if already initialized and active without admin reset
  if (targetUser.passwordHash) {
    return res.status(400).json({
      error: 'Password has already been initialized for this account. Please sign in or use Forgot Password.',
      alreadyInitialized: true,
    });
  }

  // Hash new password using salted bcrypt with cost factor 12 (meets >= 10 security policy)
  const expectedHash = targetUser.passwordHash;
  const newHash = await bcrypt.hash(cleanPass, 12);
  if (fleetState.users.find(u=>u.id===targetUser.id) !== targetUser || targetUser.passwordHash !== expectedHash || targetUser.passwordHash) return res.status(409).json({error:'This account was initialized or changed. Please sign in.'});
  targetUser.passwordHash = newHash;
  targetUser.requiresPasswordSetup = false;
  targetUser.mustChangePassword = false;
  targetUser.lastPasswordChange = new Date().toISOString();
  targetUser.failedLoginAttempts = 0;
  targetUser.lockedUntil = null;
  targetUser.updatedAt = new Date().toISOString();
  persistFleetState();

  const finalSessionId = sessionId || `sess-${Date.now()}`;
  const result = enforceSingleInstanceLogin(targetUser, finalSessionId, clientIp, deviceInfo);

  const tokenPayload = {
    sessionId: finalSessionId,
    userId: targetUser.id,
    employeeId: targetUser.employeeId,
    name: targetUser.name,
    userClass: targetUser.userClass,
    userRole: targetUser.userRole || getUserRole(targetUser),
    department: targetUser.department,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION, jwtid: crypto.randomUUID() });
  setAttachmentCookie(req,res,token);

  addAuditLog(
    { id: targetUser.id, name: targetUser.name, role: targetUser.userRole, employeeId: targetUser.employeeId },
    'INITIAL_PASSWORD_CREATED',
    'SECURITY',
    `Personnel ${targetUser.name} (${targetUser.employeeId}) established initial secure account password (bcrypt cost 12)`,
    clientIp,
    targetUser.id
  );

  res.json({
    success: true,
    token,
    tokenExpiresIn: '24h',
    user: sanitizeUser(targetUser),
    message: 'Your personal password has been successfully created. Welcome to the system!',
    session: activeSessions.get(finalSessionId),
    previousSessionRevoked: result.previousSessionRevoked,
    revokedSession: result.revokedSession,
  });
});

// 5. User Sign-Out: Session token invalidation on logout (Session tokens do not persist after logout)
app.post('/api/auth/logout', requireCsrfToken, requireAuth, (req, res) => {
  const sessionId = (req as any).user.sessionId;
  const token = undefined;
  res.clearCookie('fleet_session', { path: '/api/attachments' });
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const tokenToRevoke = token || headerToken;

  // Add token to revoked tokens blacklist immediately
  if (tokenToRevoke) {
    revokeToken(tokenToRevoke);
    console.log('[Auth] Revoked JWT token on logout');
  }

  // Remove active session
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    // A voluntary logout is acknowledged by the HTTP response; the client closes its socket.
    sessionSockets.delete(sessionId);
    broadcastActiveSessions();
    console.log(`[Auth] Session ${sessionId} terminated.`);
  }

  res.json({ success: true, message: 'Logged out and session token invalidated successfully.' });
});

// 6. Security Protocol: Public self-service password reset is disabled.
// Personnel submit a reset assistance request, which is flagged for Administrator dispatch.
app.post('/api/auth/request-password-reset', requireCsrfToken, (req, res) => {
  const { employeeId, employeeIdOrEmail, notes } = req.body;
  const rawInput = employeeId || employeeIdOrEmail;
  if (!rawInput) {
    return res.status(400).json({ error: 'Please provide your Employee ID.' });
  }

  const query = String(rawInput).trim().toLowerCase();
  const user = fleetState.users.find(
    (u) =>
      u.employeeId.toLowerCase() === query ||
      (u.email && u.email.toLowerCase() === query) ||
      u.id.toLowerCase() === query
  );

  const clientIp = getClientIp(req);
  const targetEmpId = user ? user.employeeId : String(rawInput).trim();
  const requestId = `req-reset-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  passwordResetRequests.set(targetEmpId, {
    id: requestId,
    userId: user?.id,
    employeeId: targetEmpId,
    name: user?.name || 'Unverified Personnel',
    department: user?.department || 'SSOC',
    requestedAt: new Date().toISOString(),
    notes: notes ? String(notes).trim() : undefined,
    status: 'PENDING',
    ipAddress: clientIp,
  });

  addAuditLog(
    user
      ? { id: user.id, name: user.name, role: user.userRole, employeeId: user.employeeId }
      : { id: 'ANONYMOUS', name: 'Unauthenticated Requester', role: 'UNKNOWN', employeeId: targetEmpId },
    'PASSWORD_RESET_ASSISTANCE_REQUESTED',
    'SECURITY',
    `Personnel requested administrative password reset for Employee ID ${targetEmpId}. (Self-service link generation disabled per security policy; admin temporary credentials required)`,
    clientIp,
    user?.id
  );

  // Return zero-knowledge response without exposing tokens or confirming sensitive account details
  res.json({
    success: true,
    requiresAdminReset: true,
    message:
      'Password reset request logged successfully. Under tactical fleet security protocols, public self-service reset links are disabled. Please contact your Shift Supervisor or System Administrator to receive your secure temporary password.',
    employeeId: user?.employeeId,
  });
});

// Backward compatibility alias for legacy client calls: Disallows token generation
app.post('/api/auth/forgot-password', requireCsrfToken, (req, res) => {
  const { employeeIdOrEmail } = req.body;
  if (!employeeIdOrEmail) {
    return res.status(400).json({ error: 'Please provide your Employee ID.' });
  }

  const query = String(employeeIdOrEmail).trim().toLowerCase();
  const user = fleetState.users.find(
    (u) =>
      u.employeeId.toLowerCase() === query ||
      (u.email && u.email.toLowerCase() === query) ||
      u.id.toLowerCase() === query
  );

  const clientIp = getClientIp(req);
  const targetEmpId = user ? user.employeeId : String(employeeIdOrEmail).trim();
  const requestId = `req-reset-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  passwordResetRequests.set(targetEmpId, {
    id: requestId,
    userId: user?.id,
    employeeId: targetEmpId,
    name: user?.name || 'Unverified Personnel',
    department: user?.department || 'SSOC',
    requestedAt: new Date().toISOString(),
    status: 'PENDING',
    ipAddress: clientIp,
  });

  addAuditLog(
    user
      ? { id: user.id, name: user.name, role: user.userRole, employeeId: user.employeeId }
      : { id: 'ANONYMOUS', name: 'Unauthenticated Requester', role: 'UNKNOWN', employeeId: targetEmpId },
    'PASSWORD_RESET_ASSISTANCE_REQUESTED',
    'SECURITY',
    `Password reset assistance requested for Employee ID ${targetEmpId}. (Self-service link generation disabled per security policy; admin temporary credentials required)`,
    clientIp,
    user?.id
  );

  // Strictly NEVER return resetToken
  res.json({
    success: true,
    requiresAdminReset: true,
    message:
      'Password reset request recorded. Under tactical fleet security protocols, public self-service reset links are disabled. An administrator must issue temporary credentials.',
    employeeId: user?.employeeId,
  });
});

// 7. Verify Password Reset Token: Disabled for public self-service
app.post('/api/auth/verify-reset-token', requireCsrfToken, (_req, res) => {
  return res.status(403).json({
    valid: false,
    error: 'Public password reset links are disabled for system security. Please contact an Administrator.',
    code: 'ADMIN_RESET_ONLY',
  });
});

// 8. Confirm Password Reset: Disabled for public self-service
app.post('/api/auth/reset-password', requireCsrfToken, (_req, res) => {
  return res.status(403).json({
    error: 'Direct self-service password reset is disabled. Please contact an Administrator to issue a temporary password.',
    code: 'ADMIN_RESET_ONLY',
  });
});

// 8.1. List Pending Password Reset Requests (Admin Only)
app.get('/api/auth/reset-requests', requireCsrfToken, requireAuth, requireRole('ADMIN'), (_req, res) => {
  const requests = Array.from(passwordResetRequests.values()).filter((r) => r.status === 'PENDING');
  res.json({
    success: true,
    requests,
  });
});

// 9. Sign out from other device / Kick session
app.post('/api/auth/kick', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req, res) => {
  const { employeeId, exceptSessionId } = req.body;
  if (!employeeId) {
    return res.status(400).json({ error: 'Missing employeeId' });
  }

  let kickedCount = 0;
  for (const [sId, sess] of activeSessions.entries()) {
    if (sess.employeeId === employeeId && sId !== exceptSessionId) {
      const oldWs = sessionSockets.get(sId);
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        try {
          oldWs.send(
            JSON.stringify({
              type: 'FORCE_SIGNOUT',
              targetSessionId: sId,
              reason: 'Your account was signed out from another device/instance.',
              timestamp: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.error('[Auth] Error sending kick message:', e);
        }
      }
      activeSessions.delete(sId);
      sessionSockets.delete(sId);
      kickedCount++;
    }
  }

  broadcastActiveSessions();
  res.json({ success: true, kickedCount, activeSessions: getActiveSessionsList() });
});

// 10. Get live active sessions on local network
app.get('/api/auth/active-sessions', requireAuth, requireRole('ADMIN'), (_req, res) => {
  res.json({ activeSessions: getActiveSessionsList() });
});

// 11. Health and Local Network info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connectedClients: wss.clients.size,
    activeSessionsCount: activeSessions.size,
    localIp: getClientIp(req),
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// SECURE USER MANAGEMENT & RBAC REST API
// ==========================================

// 12. List Users (Protected: requires valid auth token)
app.get('/api/users', requireAuth, (req, res) => {
  if (!canRead((req as any).user,fleetState,'users')) return res.sendStatus(403);
  res.json({ users: getSanitizedUsers() });
});

// 13. Create New User (Protected: Admin only, generates salted bcrypt hash, sets mustChangePassword)
app.post('/api/users', requireCsrfToken, requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { employeeId, qatarId, rank, userClass, userRole, groupId, name, mobileNumber, email, department, initialPassword } = req.body;
  const actor = (req as any).user;

  if (!employeeId || !name || !qatarId) {
    return res.status(400).json({ error: 'Employee ID, Name, and Qatar ID are mandatory fields.' });
  }

  if (userRole !== undefined && !['ADMIN','OFFICER','USER'].includes(userRole)) return res.status(400).json({error:'Select a valid user group.'});
  const cleanEmpId = String(employeeId).trim();
  const exists = fleetState.users.some(
    (u) => u.employeeId.toLowerCase() === cleanEmpId.toLowerCase() || u.qatarId === String(qatarId).trim()
  );

  if (exists) {
    return res.status(409).json({ error: `A user with Employee ID "${cleanEmpId}" or Qatar ID already exists.` });
  }

  // Generate temporary password if not provided
  const rawPassword = initialPassword && String(initialPassword).trim().length >= 6
    ? String(initialPassword).trim()
    : `Pass#${crypto.randomBytes(12).toString('base64url')}`;

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  if (roleOf(readAuthenticatedUser(req.headers.authorization!.slice(7))) !== 'ADMIN') throw new DataError('Administrator access is required.',403);
  if (fleetState.users.some(u=>u.employeeId.toLowerCase()===cleanEmpId.toLowerCase() || u.qatarId===String(qatarId).trim())) return res.status(409).json({error:'Employee ID or Qatar ID already exists.'});

  const selectedGroup = groupId ? fleetState.userGroups?.find(group=>group.id===groupId) : undefined;
  if (groupId && !selectedGroup) return res.status(400).json({error:'Select an existing user group.'});
  const newUser: UserItem = {
    id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    employeeId: cleanEmpId,
    qatarId: String(qatarId).trim(),
    rank: rank || '1st LT',
    userClass: classForRole(selectedGroup?.baseRole || userRole || 'USER'),
    groupId: selectedGroup?.id,
    userRole: selectedGroup ? selectedGroup.baseRole : userRole || 'USER',
    name: String(name).trim(),
    mobileNumber: mobileNumber ? String(mobileNumber).trim() : '',
    email: email ? String(email).trim() : `${cleanEmpId}@moi.gov.qa`,
    department: department === 'SSD' ? 'SSD' : 'SSOC',
    status: 'ACTIVE',
    accountStatus: 'ACTIVE',
    mustChangePassword: true,
    failedLoginAttempts: 0,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: actor.name || actor.employeeId,
  };

  fleetState.users.push(newUser);

  addAuditLog(
    actor,
    'USER_CREATED',
    'USER',
    `Registered new personnel ${newUser.name} (ID: ${newUser.employeeId}, Role: ${newUser.userRole}) with temporary credentials`,
    getClientIp(req),
    newUser.id
  );

  broadcastEntityUpdate('users', getSanitizedUsers(), (req.headers['x-session-id'] as string) || undefined);

  res.status(201).json({
    success: true,
    user: sanitizeUser(newUser),
    temporaryPassword: rawPassword,
    message: 'User created successfully. Temporary password assigned; change required upon initial login.',
  });
});

// 14. Update User Details (Protected: Admin or self-update for non-privileged fields)
app.put('/api/users/:id', requireCsrfToken, requireAuth, (req, res) => {
  const { id } = req.params;
  const actor = (req as any).user;
  const isActorAdmin = actor.userRole === 'ADMIN' || getUserRole(actor) === 'ADMIN';

  const userIndex = fleetState.users.findIndex((u) => u.id === id || u.employeeId === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const existing = fleetState.users[userIndex];
  const isSelf = actor.userId === existing.id || actor.employeeId === existing.employeeId;

  if (!isActorAdmin && !isSelf) {
    return res.status(403).json({ error: 'You are not authorized to update other users.' });
  }

  const { name, email, mobileNumber, department, rank, userClass, userRole, groupId, status, operationalRole, qatarId } = req.body;

  // Non-admins cannot elevate or change roles
  if (!isActorAdmin && (groupId !== undefined || userRole !== undefined || rank !== undefined || userClass !== undefined || status !== undefined || operationalRole !== undefined || department !== undefined || qatarId !== undefined)) {
    return res.status(403).json({ error: 'Only Administrators can change user roles.' });
  }

  const nextGroupId = groupId !== undefined ? groupId : existing.groupId;
  const selectedGroup = nextGroupId ? fleetState.userGroups?.find(group=>group.id===nextGroupId) : undefined;
  if (nextGroupId && !selectedGroup) return res.status(400).json({error:'Select an existing user group.'});
  if (isActorAdmin && userRole !== undefined && !['ADMIN','OFFICER','USER'].includes(userRole)) return res.status(400).json({error:'Invalid base role.'});
  if (isActorAdmin && qatarId !== undefined) {
    const cleaned = String(qatarId).trim();
    if (!cleaned || fleetState.users.some(u=>u.id!==existing.id && u.qatarId===cleaned)) return res.status(409).json({error:'Qatar ID must be present and unique.'});
    existing.qatarId=cleaned;
    delete (existing as any).identityConflict;
  }
  if (isActorAdmin && roleOf(existing)==='ADMIN' && (selectedGroup || userRole && userRole!=='ADMIN') &&
      fleetState.users.filter(user=>roleOf(user)==='ADMIN' && user.accountStatus!=='SUSPENDED' && !(user as any).archivedAt).length<=1) {
    return res.status(409).json({error:'Keep at least one active administrator.'});
  }
  const roleChanged = isActorAdmin && ((userRole && userRole !== existing.userRole) || groupId !== undefined && groupId !== existing.groupId);

  existing.name = name !== undefined ? String(name).trim() : existing.name;
  existing.email = email !== undefined ? String(email).trim() : existing.email;
  existing.mobileNumber = mobileNumber !== undefined ? String(mobileNumber).trim() : existing.mobileNumber;
  existing.department = department !== undefined ? department : existing.department;
  existing.status = status !== undefined ? status : existing.status;
  if (operationalRole !== undefined) existing.role = operationalRole;

  if (isActorAdmin) {
    if (rank !== undefined) existing.rank = rank;
    if (userRole !== undefined) existing.userRole = userRole;
    if (groupId !== undefined) existing.groupId = groupId || undefined;
    if (selectedGroup) existing.userRole=selectedGroup.baseRole;
    existing.userClass=classForRole(roleOf(existing));
  }

  existing.updatedAt = new Date().toISOString();

  addAuditLog(
    actor,
    'USER_UPDATED',
    'USER',
    `Updated personnel record for ${existing.name} (ID: ${existing.employeeId})`,
    getClientIp(req),
    existing.id
  );

  // Refresh membership and permissions on connected workstations.
  if (roleChanged) broadcast({type:'FULL_RESET'});
  // If role changed, update active sessions
  if (roleChanged) {
    for (const [sId, sess] of activeSessions.entries()) {
      if (sess.employeeId === existing.employeeId || sess.userId === existing.id) {
        sess.userClass = existing.userClass || existing.userRole || 'OFFICER';
      }
    }
    broadcastActiveSessions();
  }

  broadcastEntityUpdate('users', getSanitizedUsers(), (req.headers['x-session-id'] as string) || undefined);

  res.json({
    success: true,
    user: sanitizeUser(existing),
  });
});

// 15. Toggle Account Status (Admin only: ACTIVE / SUSPENDED)
app.patch('/api/users/:id/status', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'ACTIVE' | 'SUSPENDED'
  const actor = (req as any).user;

  if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
    return res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED' });
  }

  const target = fleetState.users.find((u) => u.id === id || u.employeeId === id);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (target.id === actor.userId || target.employeeId === actor.employeeId) {
    return res.status(400).json({ error: 'You cannot suspend your own administrative account.' });
  }

  if (status === 'ACTIVE' && ((target as any).identityConflict || (target as any).archivedAt)) return res.status(409).json({error:'Correct duplicate identity fields before activating this account. Archived accounts remain inactive.'});
  target.accountStatus = status;
  target.updatedAt = new Date().toISOString();

  if (status === 'SUSPENDED') {
    // Terminate all active sessions immediately
    for (const [sId, sess] of activeSessions.entries()) {
      if (sess.employeeId === target.employeeId || sess.userId === target.id) {
        const ws = sessionSockets.get(sId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({
              type: 'FORCE_SIGNOUT',
              targetSessionId: sId,
              reason: 'Your account has been suspended by an administrator. Contact system support.',
              timestamp: new Date().toISOString(),
            }));
          } catch {}
        }
        activeSessions.delete(sId);
        sessionSockets.delete(sId);
      }
    }
    broadcastActiveSessions();
  }

  addAuditLog(
    actor,
    status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
    'USER',
    `Account status for ${target.name} (ID: ${target.employeeId}) set to ${status}`,
    getClientIp(req),
    target.id
  );

  broadcastEntityUpdate('users', getSanitizedUsers());

  res.json({
    success: true,
    user: sanitizeUser(target),
    message: `Account has been ${status === 'SUSPENDED' ? 'suspended and sessions terminated' : 'reactivated'}.`,
  });
});

// 16. Admin Password Reset (Admin assigns secure temporary password, forces change on login)
app.post('/api/users/:id/admin-reset-password', requireCsrfToken, requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const actor = (req as any).user;

  const target = fleetState.users.find((u) => u.id === id || u.employeeId === id);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }

  const tempPassword = `Reset#${crypto.randomBytes(12).toString('base64url')}`;
  const resetHash = await bcrypt.hash(tempPassword, 12);
  if (roleOf(readAuthenticatedUser(req.headers.authorization!.slice(7))) !== 'ADMIN') throw new DataError('Administrator access is required.',403);
  if (fleetState.users.find(u=>u.id===target.id) !== target) return res.status(409).json({error:'This account changed while resetting its password. Please retry.'});
  target.passwordHash = resetHash;
  target.mustChangePassword = true;
  target.requiresPasswordSetup = false;
  target.failedLoginAttempts = 0;
  target.lockedUntil = null;
  target.updatedAt = new Date().toISOString();

  // Mark pending password reset request as resolved if any
  const existingReq = passwordResetRequests.get(target.employeeId);
  if (existingReq) {
    existingReq.status = 'RESOLVED';
    passwordResetRequests.set(target.employeeId, existingReq);
  }

  // Terminate active sessions
  for (const [sId, sess] of activeSessions.entries()) {
    if (sess.employeeId === target.employeeId || sess.userId === target.id) {
      const ws = sessionSockets.get(sId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'FORCE_SIGNOUT',
            targetSessionId: sId,
            reason: 'Administrator reset your password. Please sign in with your new temporary credentials.',
            timestamp: new Date().toISOString(),
          }));
        } catch {}
      }
      activeSessions.delete(sId);
      sessionSockets.delete(sId);
    }
  }
  broadcastActiveSessions();

  addAuditLog(
    actor,
    'ADMIN_RESET_PASSWORD',
    'SECURITY',
    `Admin reset credentials for ${target.name} (ID: ${target.employeeId}) with temporary password`,
    getClientIp(req),
    target.id
  );

  res.json({
    success: true,
    temporaryPassword: tempPassword,
    message: `Temporary password generated for ${target.name}. User must change password upon next sign-in.`,
  });
});

// 17. Delete User (Admin only)
app.delete('/api/users/:id', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req, res) => {
  const { id } = req.params;
  const actor = (req as any).user;

  const userIndex = fleetState.users.findIndex((u) => u.id === id || u.employeeId === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const target = fleetState.users[userIndex];
  if (target.id === actor.userId || target.employeeId === actor.employeeId) {
    return res.status(400).json({ error: 'Cannot delete your own administrative account.' });
  }

  const adminCount = fleetState.users.filter((u) => !(u as any).archivedAt && u.accountStatus !== 'SUSPENDED' && getUserRole(u) === 'ADMIN').length;
  if ((target.userRole === 'ADMIN' || getUserRole(target) === 'ADMIN') && adminCount <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining Administrator in the system.' });
  }

  // Terminate active sessions
  for (const [sId, sess] of activeSessions.entries()) {
    if (sess.employeeId === target.employeeId || sess.userId === target.id) {
      const ws = sessionSockets.get(sId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: 'FORCE_SIGNOUT',
            targetSessionId: sId,
            reason: 'Your account was removed by an administrator.',
            timestamp: new Date().toISOString(),
          }));
        } catch {}
      }
      activeSessions.delete(sId);
      sessionSockets.delete(sId);
    }
  }
  broadcastActiveSessions();

  (target as any).archivedAt = new Date().toISOString();
  target.accountStatus = 'SUSPENDED';
  target.status = 'OFF_DUTY';
  target.updatedAt = new Date().toISOString();

  addAuditLog(
    actor,
    'USER_DELETED',
    'USER',
    `Deleted user account ${target.name} (ID: ${target.employeeId})`,
    getClientIp(req),
    target.id
  );

  broadcastEntityUpdate('users', getSanitizedUsers());

  res.json({ success: true, message: 'User deleted successfully' });
});




app.get('/api/user-groups', requireAuth, (_req,res)=>res.json({groups:fleetState.userGroups || []}));
app.post('/api/user-groups', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req,res)=>{
  const name=typeof req.body.name==='string'?req.body.name.trim():'';
  if(!name||name.length>50||req.body.roleId||req.body.baseRole!==undefined) return res.status(400).json({error:'Enter a group name. Configure approval access in Permissions.'});
  if(['ADMIN','OFFICER','USER'].includes(name.toUpperCase())||fleetState.userGroups?.some(group=>group.name.toLowerCase()===name.toLowerCase()))return res.status(409).json({error:'A group with this name already exists.'});
  if((fleetState.userGroups || []).length>=30)return res.status(400).json({error:'The maximum of 30 custom groups has been reached.'});
  const group:UserGroup={id:crypto.randomUUID(),name,baseRole:'USER'};
  fleetState.userGroups=[...(fleetState.userGroups || []),group];
  fleetState.groupPrivileges['GROUP:'+group.id]={...DEFAULT_GROUP_PRIVILEGES.USER};
  addAuditLog({...((req as any).user),role:'ADMIN'},'GROUP_CREATED','ROLE','Created group '+name,getClientIp(req));
  broadcast({type:'FULL_RESET'});
  res.status(201).json({group,groups:fleetState.userGroups,groupPrivileges:fleetState.groupPrivileges});
});
app.patch('/api/user-groups/:id', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req,res)=>{
  const group=fleetState.userGroups?.find(item=>item.id===req.params.id);
  if(!group)return res.status(404).json({error:'Custom group not found.'});
  const name=typeof req.body.name==='string'?req.body.name.trim():'';
  if(!name||name.length>50||req.body.roleId||req.body.baseRole!==undefined) return res.status(400).json({error:'Enter a group name. Configure approval access in Permissions.'});
  if(['ADMIN','OFFICER','USER'].includes(name.toUpperCase())||fleetState.userGroups?.some(item=>item.id!==group.id&&item.name.toLowerCase()===name.toLowerCase()))return res.status(409).json({error:'A group with this name already exists.'});
  fleetState.userGroups=fleetState.userGroups!.map(item=>item.id===group.id?{...item,name}:item);
  addAuditLog({...((req as any).user),role:'ADMIN'},'GROUP_UPDATED','ROLE','Updated group '+group.name+' to '+name,getClientIp(req));
  broadcast({type:'FULL_RESET'});
  res.json({groups:fleetState.userGroups,groupPrivileges:fleetState.groupPrivileges});
});
app.delete('/api/user-groups/:id', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req,res)=>{
  const group=fleetState.userGroups?.find(item=>item.id===req.params.id);
  if(!group)return res.status(404).json({error:'Custom group not found.'});
  if(fleetState.users.some(user=>user.groupId===group.id))return res.status(409).json({error:'Move all users to another group before deleting this group.'});
  fleetState.userGroups=fleetState.userGroups!.filter(item=>item.id!==group.id);
  delete fleetState.groupPrivileges['GROUP:'+group.id];
  addAuditLog({...((req as any).user),role:'ADMIN'},'GROUP_DELETED','ROLE','Deleted group '+group.name,getClientIp(req));
  broadcast({type:'FULL_RESET'});
  res.json({groups:fleetState.userGroups,groupPrivileges:fleetState.groupPrivileges});
});

// 18. Get Group Privileges Matrix (Server-authoritative)
app.get('/api/groups/permissions', requireAuth, (req, res) => {
  const role = roleOf((req as any).user);
  res.json({ groupPrivileges: projectState((req as any).user,fleetState,store.versions()).groupPrivileges });
});

// 19. Update Group Privileges Matrix (Admin only)
app.put('/api/groups/permissions', requireCsrfToken, requireAuth, requireRole('ADMIN'), (req, res) => {
  const { privileges } = req.body;
  const actor = (req as any).user;

  if (!privileges || typeof privileges !== 'object') {
    return res.status(400).json({ error: 'Invalid permissions payload' });
  }

  for (const values of Object.values(privileges)) {
    if (!values || typeof values !== 'object' || Array.isArray(values) || Object.values(values).some(value=>typeof value!=='boolean')) return res.status(400).json({error:'Permission values must be booleans.'});
  }
  fleetState.groupPrivileges = {
    ADMIN: { ...DEFAULT_GROUP_PRIVILEGES.ADMIN, ...(privileges.ADMIN || {}), VIEW_TAB_USERS:true, APPROVE_REQUESTS:true },
    OFFICER: { ...DEFAULT_GROUP_PRIVILEGES.OFFICER, ...(privileges.OFFICER || {}) },
    USER: { ...DEFAULT_GROUP_PRIVILEGES.USER, ...(privileges.USER || {}) },
    ...Object.fromEntries((fleetState.userGroups || []).map(group=>['GROUP:'+group.id,Object.fromEntries(Object.keys(DEFAULT_GROUP_PRIVILEGES.USER).map(key=>[key,privileges['GROUP:'+group.id]?.[key] === true]))])),
  };

  addAuditLog(
    actor,
    'PRIVILEGES_UPDATED',
    'ROLE',
    'Updated system-wide Permissions Matrix configuration',
    getClientIp(req)
  );

  broadcast({
    type: 'GROUP_PRIVILEGES_UPDATED',
    groupPrivileges: fleetState.groupPrivileges,
  });

  res.json({ success: true, groupPrivileges: fleetState.groupPrivileges });
});

// 20. Authenticated Password Change (Self change or Forced First Login change)
app.post('/api/auth/change-password', requireCsrfToken, requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const actor = (req as any).user;

  if (!newPassword || String(newPassword).trim().length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = fleetState.users.find((u) => u.id === actor.userId || u.employeeId === actor.employeeId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // If user is not flagged with mustChangePassword, verify their current password
  if (!user.mustChangePassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    const isCurrentMatch = user.passwordHash
      ? await bcrypt.compare(String(currentPassword).trim(), user.passwordHash)
      : false;
    if (!isCurrentMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
  }

  const cleanNewPass = String(newPassword).trim();
  const expectedHash = user.passwordHash;
  const changedHash = await bcrypt.hash(cleanNewPass, 12);
  readAuthenticatedUser(req.headers.authorization!.slice(7));
  if (fleetState.users.find(u=>u.id===user.id) !== user || user.passwordHash !== expectedHash) return res.status(409).json({error:'Your account changed while updating its password. Please retry.'});
  user.passwordHash = changedHash;
  user.mustChangePassword = false;
  user.lastPasswordChange = new Date().toISOString();
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.updatedAt = new Date().toISOString();

  const tokenPayload = {
    sessionId: actor.sessionId,
    userId: user.id,
    employeeId: user.employeeId,
    name: user.name,
    userClass: user.userClass,
    userRole: user.userRole || getUserRole(user),
    department: user.department,
  };
  const freshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION, jwtid: crypto.randomUUID() });
  setAttachmentCookie(req,res,freshToken);

  addAuditLog(
    actor,
    'PASSWORD_CHANGED',
    'SECURITY',
    `User ${user.name} (${user.employeeId}) changed account password (bcrypt cost 12)`,
    getClientIp(req),
    user.id
  );
  revokeToken(req.headers.authorization!.slice(7));

  res.json({
    success: true,
    token: freshToken,
    user: sanitizeUser(user),
    message: 'Password successfully changed and secured.',
  });
});

// 21. Audit Trail Logs (Admin only)
app.get('/api/audit-logs', requireAuth, requireRole('ADMIN'), (_req, res) => {
  res.json({ auditLogs: fleetState.auditLogs || [] });
});

app.use('/api', (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  fleetState = store.load() as FleetDataState;
  console.error('[API] Request failed:', error.message);
  res.status(error.status || 500).json({ error: error instanceof DataError ? error.message : 'The change could not be saved. Please retry or contact the administrator.', code: error.code || 'SAVE_FAILED' });
});

// Dev vs Prod Vite Integration
async function startServer() {
  await initializeUserHashes();
  const backups = startBackups(store, path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR,'backups')), { intervalMs: BACKUP_INTERVAL_MINUTES*60000, configuration: backupConfiguration, configurationDestination:CONFIGURATION_BACKUP_DIR, retentionDays: BACKUP_RETENTION_DAYS, timeZone:BACKUP_TIMEZONE });
  await backups.run();
  const stop = () => { backups.stop(); server.close(() => { store.close(); process.exit(0); }); for (const ws of wss.clients) ws.close(); setTimeout(()=>process.exit(0),5000).unref(); };
  process.once('SIGTERM',stop); process.once('SIGINT',stop);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Vite middleware attached for development');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Server] Serving production build from dist');
  }

  server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`🚀 DRONES SYSTEM SECTION Local Network Server Ready!`);
    console.log(`📡 Local Network URL: http://${HOST}:${PORT}`);
    console.log(`🔌 Real-Time WebSocket Endpoint: ws://${HOST}:${PORT}/api/ws`);
    console.log(`🛡️  Security: bcrypt (cost: 12), JWT (24h), CSRF, Rate Limiting & Expiring Password Resets active`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
