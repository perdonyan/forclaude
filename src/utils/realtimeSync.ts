import { RecordSync } from './recordSync.mjs';
import {
  ActiveSession,
  DroneItem,
  BatteryItem,
  AccessoryItem,
  StreamingDeviceItem,
  CheckoutRecord,
  HandoverFormRecord,
  UserItem,
  NotificationMessage,
  FleetServerState,
  GroupPrivileges,
  AuditLogEntry,
} from '../types/drone';

const SESSION_STORAGE_KEY = 'aerotrack_client_session_id_v1';
const JWT_STORAGE_KEY = 'aerotrack_client_jwt_token_v1';

// Generate or retrieve persistent Session ID for this browser tab/window
export function getClientSessionId(): string {
  try {
    let sessId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessId) {
      sessId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessId);
    }
    return sessId;
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Rotate session token upon authentication / logout to prevent session fixation attacks
export function rotateClientSessionId(): string {
  const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
  } catch {}
  return newId;
}

export function getClientJwtToken(): string | null {
  try {
    return sessionStorage.getItem(JWT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setClientJwtToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(JWT_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(JWT_STORAGE_KEY);
    }
  } catch {}
}

// Generate human-friendly device identifier for LAN display
export function getClientDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'Device';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

export interface ForceSignoutPayload {
  reason: string;
  newDevice?: string;
  newIp?: string;
  timestamp: string;
}

type StateListener = (state: FleetServerState) => void;
type EntityUpdateListener = (entity: keyof FleetServerState, data: any) => void;
type ActiveSessionsListener = (sessions: ActiveSession[]) => void;
type ForceSignoutListener = (payload: ForceSignoutPayload) => void;

async function parseResponseJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      // ignore
    }
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // If HTML or other format returned, sanitize and return human-readable message
    if (text.includes('<html') || text.includes('<!DOCTYPE')) {
      return { error: `Server error (HTTP ${res.status}): Please retry or refresh the page.` };
    }
    return { error: text || `Server error (HTTP ${res.status})` };
  }
}

class RealtimeSyncClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isConnecting = false;
  private stateListeners: Set<StateListener> = new Set();
  private entityListeners: Set<EntityUpdateListener> = new Set();
  private activeSessionsListeners: Set<ActiveSessionsListener> = new Set();
  private forceSignoutListeners: Set<ForceSignoutListener> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private cachedCsrfToken: string | null = null;
  private csrfExpiresAt = 0;

  private recordSync = new RecordSync({
    request: async (operations: any[]) => {
      const csrf = await this.getCsrfToken();
      const res = await fetch('/api/fleet/mutate', { method:'POST', headers:{'Content-Type':'application/json','x-csrf-token':csrf,'Authorization':`Bearer ${getClientJwtToken() || ''}`}, body:JSON.stringify({operations}) });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.error || 'The change could not be saved.');
      return data;
    },
    reload: () => this.fetchFullState(false),
    publish: (state: FleetServerState) => this.stateListeners.forEach(l=>l(state)),
    onError: (message: string) => window.dispatchEvent(new CustomEvent('fleet-save-error',{detail:message})),
    authenticated: () => !!getClientJwtToken(),
  });
  whenSettled() { return this.recordSync.settled(); }
  public isConnected = false;
  public sessionId = getClientSessionId();

  // Fetch CSRF Token with auto-caching
  async getCsrfToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedCsrfToken && now < this.csrfExpiresAt) {
      return this.cachedCsrfToken;
    }
    try {
      const res = await fetch('/api/auth/csrf-token');
      if (res.ok) {
        const data = await parseResponseJson(res);
        this.cachedCsrfToken = data.csrfToken;
        this.csrfExpiresAt = now + 90 * 60 * 1000; // 90 min cache
        return data.csrfToken;
      }
    } catch (e) {
      console.error('[Realtime] Failed to fetch CSRF token:', e);
    }
    return '';
  }

  connect() {
    if (!getClientJwtToken()) return;
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log('[Realtime] WebSocket connected to Local Network Server');
        this.notifyStatus(true);

        // Identify current session with JWT token if available
        this.send({
          type: 'IDENTIFY_SESSION',
          sessionId: this.sessionId,
          token: getClientJwtToken(),
          deviceInfo: getClientDeviceInfo(),
        });

        // Start ping interval
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: 'PING', sessionId: this.sessionId });
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('[Realtime] Error parsing incoming WS message:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (event.code === 4001 && getClientJwtToken()) this.handleServerMessage({type:'FORCE_SIGNOUT',reason:'Your session is no longer active. Please sign in again.'});
        if (getClientJwtToken()) this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[Realtime] WebSocket error event:', err);
        this.isConnected = false;
        this.notifyStatus(false);
      };
    } catch (e) {
      console.error('[Realtime] WebSocket initialization error:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[Realtime] Attempting to reconnect...');
      this.connect();
    }, 3000);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((l) => {
      try {
        l(connected);
      } catch (err) {
        console.error(err);
      }
    });
  }

  private handleServerMessage(msg: any) {
    switch (msg.type) {
      case 'INIT_STATE':
      case 'FULL_RESET':
        if (msg.state) {
          this.recordSync.accept(msg.state);
          if (msg.state.activeSessions) {
            this.activeSessionsListeners.forEach((l) => l(msg.state.activeSessions));
          }
        }
        break;

      case 'SYNC_UPDATE':
        if (msg.entity && msg.data) {
          if (this.recordSync.acceptEntity(msg.entity,msg.data,msg.versions)) this.entityListeners.forEach((l) => l(msg.entity, msg.data));
        }
        break;

      case 'ACTIVE_SESSIONS_UPDATED':
        if (msg.activeSessions) {
          this.activeSessionsListeners.forEach((l) => l(msg.activeSessions));
        }
        break;

      case 'GROUP_PRIVILEGES_UPDATED':
        if (msg.groupPrivileges) {
          this.entityListeners.forEach((l) => l('groupPrivileges' as any, msg.groupPrivileges));
        }
        break;

      case 'FORCE_SIGNOUT':
        console.warn('[Realtime] Received FORCE_SIGNOUT:', msg);
        // Clean client-side token immediately
        setClientJwtToken(null);
        this.recordSync.clear();
        this.ws?.close();
        this.forceSignoutListeners.forEach((l) =>
          l({
            reason: msg.reason || 'Signed out from another instance.',
            newDevice: msg.newDevice,
            newIp: msg.newIp,
            timestamp: msg.timestamp || new Date().toISOString(),
          })
        );
        break;

      case 'PONG':
        break;

      default:
        break;
    }
  }

  // Subscribe to full initial state or factory resets
  onStateInit(listener: StateListener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onState(listener: StateListener) {
    return this.onStateInit(listener);
  }

  // Subscribe to entity mutations
  onEntityUpdate(listener: EntityUpdateListener) {
    this.entityListeners.add(listener);
    return () => this.entityListeners.delete(listener);
  }

  // Subscribe to active sessions list
  onActiveSessions(listener: ActiveSessionsListener) {
    this.activeSessionsListeners.add(listener);
    return () => this.activeSessionsListeners.delete(listener);
  }

  // Subscribe to force signout notifications
  onForceSignout(listener: ForceSignoutListener) {
    this.forceSignoutListeners.add(listener);
    return () => this.forceSignoutListeners.delete(listener);
  }

  // Subscribe to connection status
  onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => this.statusListeners.delete(listener);
  }

  // Send raw message over WebSocket if open
  send(message: object): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  mutate<K extends keyof FleetServerState>(entity: K, data: FleetServerState[K]) {
    this.recordSync.mutate(entity,data);
  }

  // Fetch full state via HTTP
  async fetchFullState(publish = true): Promise<FleetServerState | null> {
    try {
      if (!getClientJwtToken()) return null;
      const token = getClientJwtToken();
      const res = await fetch('/api/fleet/state', {headers:{'Authorization':`Bearer ${token}`}});
      if (token !== getClientJwtToken()) return null;
      if (res.status === 401) { this.handleServerMessage({type:'FORCE_SIGNOUT',reason:'Your session is no longer active. Please sign in again.'}); return null; }
      if (res.ok) {
        const state = await res.json();
        if (publish) this.recordSync.accept(state);
        return state;
      }
    } catch (e) {
      console.error('[Realtime] Failed to fetch fleet state:', e);
    }
    return null;
  }

  // Secure User Sign In with:
  // - CSRF token header
  // - Server-side bcrypt verification
  // - Rate limiting protection
  // - JWT token generation (< 24 hours expiration)
  // - Single-instance enforcement
  async login(credentials: { employeeId: string; password?: string; deviceInfo?: string }) {
    this.sessionId = rotateClientSessionId();
    const csrf = await this.getCsrfToken();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
      },
      body: JSON.stringify({
        employeeId: credentials.employeeId,
        password: credentials.password || '',
        sessionId: this.sessionId,
        deviceInfo: credentials.deviceInfo || getClientDeviceInfo(),
      }),
    });

    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Securely store JWT token (expires in 24 hours)
    if (data.token) {
      setClientJwtToken(data.token);
    }

    this.connect();
    await this.fetchFullState();
    // Register active socket with session and token
    this.send({
      type: 'IDENTIFY_SESSION',
      sessionId: this.sessionId,
      token: data.token,
      deviceInfo: getClientDeviceInfo(),
    });

    return data;
  }

  // User Sign Out: Invalidate server session and JWT token, purge client tokens
  async logout() {
    this.recordSync.clear();
    const currentToken = getClientJwtToken();

    try {
      const csrf = await this.getCsrfToken();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
          'Authorization': currentToken ? `Bearer ${currentToken}` : '',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          token: currentToken,
        }),
      });
    } catch {
      // ignore network errors
    } finally {
      // Purge and rotate tokens
      setClientJwtToken(null);
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
      this.sessionId = rotateClientSessionId();
      this.ws?.close();
    }
  }

  // Sign out a user from other devices
  async kickOtherDevices(employeeId: string) {
    const csrf = await this.getCsrfToken();
    const res = await fetch('/api/auth/kick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': `Bearer ${getClientJwtToken() || ''}`,
      },
      body: JSON.stringify({
        employeeId,
        exceptSessionId: this.sessionId,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to sign out other devices');
    }

    return await parseResponseJson(res);
  }

  // Password Reset Assistance: Request Administrator intervention (public link generation is disabled)
  async requestPasswordReset(params: { employeeId: string; notes?: string }) {
    const csrf = await this.getCsrfToken();
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
      },
      body: JSON.stringify(params),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit password reset request');
    }
    return data;
  }

  // Alias for backward compatibility
  async forgotPassword(employeeIdOrEmail: string) {
    return this.requestPasswordReset({ employeeId: employeeIdOrEmail });
  }

  // Get Pending Password Reset Requests (Admin only)
  async getPendingPasswordResetRequests() {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch('/api/auth/reset-requests', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load password reset requests');
    }
    return data.requests || [];
  }

  // Reset to original factory database
  async resetFleetData() {
    const csrf = await this.getCsrfToken();
    const res = await fetch('/api/fleet/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': `Bearer ${getClientJwtToken() || ''}`,
      },
    });
    const data = await parseResponseJson(res);
    if (!res.ok) throw new Error(data.error || 'Reset is disabled.');
    return data;
  }

  // Create New User (Admin only, server sets salted bcrypt hash and temporary credentials)
  async createUser(payload: {
    employeeId: string;
    qatarId: string;
    rank?: string;
    userClass?: string;
    userRole?: string;
    groupId?: string;
    name: string;
    mobileNumber?: string;
    email?: string;
    department?: string;
    initialPassword?: string;
  }) {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
        'x-session-id': this.sessionId,
      },
      body: JSON.stringify(payload),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create user');
    }
    return data;
  }

  // Update User Details
  async updateUser(id: string, payload: Partial<UserItem> & { operationalRole?: string }) {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
        'x-session-id': this.sessionId,
      },
      body: JSON.stringify(payload),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user');
    }
    return data;
  }

  // Toggle Account Status (ACTIVE / SUSPENDED)
  async updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch(`/api/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ status }),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update user status');
    }
    return data;
  }

  // Admin Reset Password (generates temporary password)
  async adminResetPassword(id: string) {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch(`/api/users/${encodeURIComponent(id)}/admin-reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({}),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate temporary password');
    }
    return data;
  }

  // Delete User Account
  async deleteUser(id: string) {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }
    return data;
  }

  // Change Password (Self or Forced on first sign-in)
  async changePassword(params: { currentPassword?: string; newPassword: string }) {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(params),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password');
    }
    if (data.token) {
      setClientJwtToken(data.token);
      this.send({type:'IDENTIFY_SESSION',sessionId:this.sessionId,token:data.token,deviceInfo:getClientDeviceInfo()});
    }
    return data;
  }

  // Initial Password Setup on First Login (Users create their own password)
  async initialPasswordSetup(params: { employeeId: string; newPassword: string; qatarId?: string; deviceInfo?: string }) {
    this.sessionId = rotateClientSessionId();
    const csrf = await this.getCsrfToken();

    const res = await fetch('/api/auth/initial-password-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
      },
      body: JSON.stringify({
        ...params,
        sessionId: this.sessionId,
        deviceInfo: params.deviceInfo || getClientDeviceInfo(),
      }),
    });

    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to initialize account password');
    }

    if (data.token) {
      setClientJwtToken(data.token);
    }

    this.connect();
    await this.fetchFullState();
    this.send({
      type: 'IDENTIFY_SESSION',
      sessionId: this.sessionId,
      token: data.token,
      deviceInfo: getClientDeviceInfo(),
    });

    return data;
  }


  async getUserGroups() {
    const response=await fetch('/api/user-groups',{headers:{Authorization:'Bearer '+getClientJwtToken()}});
    const data=await parseResponseJson(response);if(!response.ok)throw new Error(data.error || 'Failed to load groups.');
    return data.groups;
  }
  async createUserGroup(name:string) {
    const response=await fetch('/api/user-groups',{method:'POST',headers:{Authorization:'Bearer '+getClientJwtToken(),'Content-Type':'application/json','x-csrf-token':await this.getCsrfToken()},body:JSON.stringify({name})});
    const data=await parseResponseJson(response);if(!response.ok)throw new Error(data.error || 'Failed to create group.');
    this.entityListeners.forEach(listener=>listener('groupPrivileges',data.groupPrivileges));
    this.entityListeners.forEach(listener=>listener('userGroups',data.groups));
    return data;
  }
  async manageGroup(id:string,method:'PATCH'|'DELETE',values?:{name:string}) {
    const response=await fetch('/api/user-groups/'+encodeURIComponent(id),{method,headers:{Authorization:'Bearer '+getClientJwtToken(),'Content-Type':'application/json','x-csrf-token':await this.getCsrfToken()},body:values?JSON.stringify(values):undefined});
    const data=await parseResponseJson(response);if(!response.ok)throw new Error(data.error || 'Unable to save this change.');
    await this.fetchFullState();
    this.entityListeners.forEach(listener=>listener('userGroups',data.groups));
    this.entityListeners.forEach(listener=>listener('groupPrivileges',data.groupPrivileges));
    return data;
  }
  // Fetch Server-Authoritative Group Privileges Matrix
  async getGroupPrivileges(): Promise<GroupPrivileges | null> {
    try {
      const res = await fetch('/api/groups/permissions',{headers:{'Authorization':`Bearer ${getClientJwtToken() || ''}`}});
      if (res.ok) {
        const data = await parseResponseJson(res);
        return data.groupPrivileges || null;
      }
    } catch (err) {
      console.error('[Realtime] Failed to fetch privileges:', err);
    }
    return null;
  }

  // Update Server-Authoritative Group Privileges Matrix
  async updateGroupPrivileges(privileges: GroupPrivileges) {
    const csrf = await this.getCsrfToken();
    const token = getClientJwtToken();
    const res = await fetch('/api/groups/permissions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrf,
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ privileges }),
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update permissions');
    }
    return data;
  }

  // Get Security Audit Logs (Admin only)
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const token = getClientJwtToken();
    const res = await fetch('/api/audit-logs', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    const data = await parseResponseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load audit logs');
    }
    return data.auditLogs || [];
  }
}

export const realtimeSync = new RealtimeSyncClient();
