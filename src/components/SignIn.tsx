import React, { useState } from 'react';
import { UserItem, ActiveSession } from '../types/drone';
import { ForceSignoutPayload, realtimeSync } from '../utils/realtimeSync';
import {
  Plane,
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  ShieldAlert,
  Wrench,
  Wifi,
  LogOut,
  Radio,
  Laptop,
  KeyRound,
  CheckCircle2,
  Clock,
  ArrowLeft
} from 'lucide-react';

interface SignInProps {
  users: UserItem[];
  onSignInSuccess: (user: UserItem, forceSignoutOther?: boolean) => void;
  activeSessions?: ActiveSession[];
  onSignOutOtherDevice?: (employeeId: string) => Promise<void>;
  forceSignoutNotice?: ForceSignoutPayload | null;
  onDismissForceSignout?: () => void;
  isConnected?: boolean;
}

export const SignIn: React.FC<SignInProps> = ({
  users,
  onSignInSuccess,
  activeSessions = [],
  onSignOutOtherDevice,
  forceSignoutNotice,
  onDismissForceSignout,
  isConnected = true,
}) => {
  const completeSignIn = (user: UserItem, forceSignoutOther?: boolean) => {
    // Dismiss the mobile keyboard before replacing the sign-in screen.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    onSignInSuccess(user, forceSignoutOther);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOutRemote, setIsSigningOutRemote] = useState(false);
  const [remoteSuccessMsg, setRemoteSuccessMsg] = useState<string | null>(null);

  // Password Reset View State (Admin-Only Reset Architecture)
  const [viewMode, setViewMode] = useState<'LOGIN' | 'INITIAL_LOGIN' | 'FORGOT_PASSWORD' | 'MUST_CHANGE_PASSWORD'>('LOGIN');
  const [resetEmpOrEmail, setResetEmpOrEmail] = useState('');
  const [resetNotes, setResetNotes] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Initial Login State (Users create their own password during initial login)
  const [initialSetupEmpId, setInitialSetupEmpId] = useState('');
  const [initialSetupQatarId, setInitialSetupQatarId] = useState('');
  const [initialSetupNewPass, setInitialSetupNewPass] = useState('');
  const [initialSetupConfirmPass, setInitialSetupConfirmPass] = useState('');
  const [initialSetupShowNewPass, setInitialSetupShowNewPass] = useState(false);
  const [initialSetupShowConfirmPass, setInitialSetupShowConfirmPass] = useState(false);
  const [initialSetupError, setInitialSetupError] = useState<string | null>(null);

  // Mandatory Password Change State (First login or admin reset)
  const [forcedCurrentUser, setForcedCurrentUser] = useState<UserItem | null>(null);
  const [forcedCurrentPass, setForcedCurrentPass] = useState('');
  const [forcedNewPass, setForcedNewPass] = useState('');
  const [forcedConfirmPass, setForcedConfirmPass] = useState('');
  const [forcedShowNewPass, setForcedShowNewPass] = useState(false);
  const [forcedShowConfirmPass, setForcedShowConfirmPass] = useState(false);
  const [forcedError, setForcedError] = useState<string | null>(null);

  const cleanInputEmpId = employeeId.trim().toLowerCase();

  // Matched user for initial setup helper
  const initialMatchedUser = users.find(
    (u) =>
      u.employeeId.toLowerCase() === initialSetupEmpId.trim().toLowerCase() ||
      u.id.toLowerCase() === initialSetupEmpId.trim().toLowerCase()
  );

  // Check if entered user has an active session on another device
  const targetActiveSession = activeSessions.find(
    (s) => s.employeeId.toLowerCase() === cleanInputEmpId || s.userId.toLowerCase() === cleanInputEmpId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = password.trim();

    if (!cleanInputEmpId) {
      setError('Please enter your Employee ID.');
      return;
    }

    // Check if user requires initial password creation locally
    const localUser = users.find(
      (u) => u.employeeId.toLowerCase() === cleanInputEmpId || u.id.toLowerCase() === cleanInputEmpId
    );
    if (localUser && localUser.requiresPasswordSetup && !cleanPass) {
      setInitialSetupEmpId(localUser.employeeId);
      setInitialSetupError(null);
      setViewMode('INITIAL_LOGIN');
      return;
    }

    if (!cleanPass) {
      setError('Please enter your account password, or use Initial Login below if this is your first time signing in.');
      return;
    }

    setIsLoading(true);
    try {
      // Authenticate strictly with server using bcrypt verification, rate limiting, and CSRF token
      const res = await realtimeSync.login({
        employeeId: cleanInputEmpId,
        password: cleanPass,
      });

      if (res && res.initialSetupRequired) {
        setInitialSetupEmpId(res.employeeId || cleanInputEmpId);
        setInitialSetupError(null);
        setViewMode('INITIAL_LOGIN');
        return;
      }

      if (res && res.user) {
        if (res.mustChangePassword || res.user.mustChangePassword) {
          setForcedCurrentUser(res.user);
          setForcedCurrentPass(cleanPass);
          setViewMode('MUST_CHANGE_PASSWORD');
          return;
        }
        completeSignIn(res.user, true);
      } else {
        setError('Authentication succeeded but user profile was not returned.');
      }
    } catch (err: any) {
      console.error('[SignIn] Login error:', err);
      // If error suggests initial setup needed:
      if (err.message && err.message.toLowerCase().includes('initial login')) {
        setInitialSetupEmpId(cleanInputEmpId);
        setViewMode('INITIAL_LOGIN');
        return;
      }
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitialSetupError(null);

    const cleanEmp = initialSetupEmpId.trim();
    if (!initialSetupQatarId.trim()) { setInitialSetupError('Qatar ID is required to verify your identity.'); return; }
    const cleanPass = initialSetupNewPass.trim();

    if (!cleanEmp) {
      setInitialSetupError('Please enter your Employee ID.');
      return;
    }

    if (cleanPass.length < 6) {
      setInitialSetupError('Password must be at least 6 characters long.');
      return;
    }

    if (cleanPass !== initialSetupConfirmPass.trim()) {
      setInitialSetupError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await realtimeSync.initialPasswordSetup({
        employeeId: cleanEmp,
        newPassword: cleanPass,
        qatarId: initialSetupQatarId.trim() || undefined,
      });

      if (res && res.user) {
        completeSignIn(res.user, true);
      } else {
        setRemoteSuccessMsg('Password successfully created! Please sign in with your new password.');
        setViewMode('LOGIN');
        setPassword(cleanPass);
        setEmployeeId(cleanEmp);
      }
    } catch (err: any) {
      setInitialSetupError(err.message || 'Failed to initialize password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForcedPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForcedError(null);

    if (forcedNewPass.length < 6) {
      setForcedError('New password must be at least 6 characters long.');
      return;
    }

    if (forcedNewPass !== forcedConfirmPass) {
      setForcedError('New password and confirmation do not match.');
      return;
    }

    if (forcedNewPass === forcedCurrentPass) {
      setForcedError('New password must be different from your temporary password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await realtimeSync.changePassword({
        currentPassword: forcedCurrentPass,
        newPassword: forcedNewPass,
      });

      if (res && res.user) {
        completeSignIn(res.user, true);
      } else if (forcedCurrentUser) {
        completeSignIn({ ...forcedCurrentUser, mustChangePassword: false }, true);
      }
    } catch (err: any) {
      setForcedError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualKickRemote = async (empId: string) => {
    if (!onSignOutOtherDevice) return;
    try {
      setIsSigningOutRemote(true);
      await onSignOutOtherDevice(empId);
      setRemoteSuccessMsg(`Remote session for ID ${empId} has been terminated.`);
      setTimeout(() => setRemoteSuccessMsg(null), 4000);
    } catch {
      setError('Failed to disconnect remote session.');
    } finally {
      setIsSigningOutRemote(false);
    }
  };

  // Admin-Only Password Reset Request Handler
  const handleRequestAdminReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMsg(null);
    const cleanEmp = resetEmpOrEmail.trim();
    if (!cleanEmp) {
      setResetError('Please enter your Employee ID.');
      return;
    }

    setIsResetting(true);
    try {
      const data = await realtimeSync.requestPasswordReset({
        employeeId: cleanEmp,
        notes: resetNotes.trim() || undefined,
      });
      setResetSuccessMsg(
        data.message ||
          'Reset request registered. Under security protocols, public self-service links are disabled. Please contact your Shift Supervisor or System Administrator to receive a secure temporary password.'
      );
    } catch (err: any) {
      setResetError(err.message || 'Failed to submit reset assistance request.');
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-4">
        {/* Remote Force-Signout Alert Banner */}
        {forceSignoutNotice && (
          <div className="bg-rose-950/80 border border-rose-600 rounded-2xl p-4 shadow-xl text-xs text-rose-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <LogOut className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-100 text-sm">Signed Out from Other Device</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-300">
                  {forceSignoutNotice.reason}
                </p>
                {forceSignoutNotice.newIp && (
                  <div className="mt-2 text-[10px] font-mono text-rose-400 bg-rose-900/40 px-2 py-1 rounded border border-rose-800">
                    Logged in from: {forceSignoutNotice.newDevice || 'Workstation'} ({forceSignoutNotice.newIp})
                  </div>
                )}
                {onDismissForceSignout && (
                  <button
                    onClick={onDismissForceSignout}
                    className="mt-2.5 px-2.5 py-1 bg-rose-800/80 hover:bg-rose-700 text-white rounded text-[11px] font-medium cursor-pointer"
                  >
                    Dismiss Notice
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security Hardened Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Application Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-3">
              <Plane className="w-6 h-6 -rotate-45" />
            </div>
            <h1 className="text-base font-bold tracking-wider text-slate-100 uppercase">
              DRONES SYSTEM SECTION
            </h1>
            <p className="text-xs text-sky-400 font-medium tracking-wide mt-1">
              Inventory Management & Operations
            </p>
          </div>

          {/* Success Notification Messages */}
          {remoteSuccessMsg && (
            <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Radio className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{remoteSuccessMsg}</span>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {/* Error Notice */}
          {error && viewMode === 'LOGIN' && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {resetError && viewMode !== 'LOGIN' && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="flex-1">{resetError}</div>
            </div>
          )}

          {/* MODE 1: STANDARD SECURE SIGN-IN FORM */}
          {viewMode === 'LOGIN' && (
            <>
              {/* Target Active Session Warning */}
              {targetActiveSession && (
                <div className="mb-5 p-3 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <Laptop className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-amber-300">
                        Active Session Detected on Another Device
                      </div>
                      <p className="text-[11px] text-amber-400/90 mt-0.5">
                        User {targetActiveSession.name} ({targetActiveSession.employeeId}) is currently active on:
                      </p>
                      <p className="font-mono text-[10px] text-slate-300 mt-0.5">
                        {targetActiveSession.deviceInfo || 'Workstation'} • IP: {targetActiveSession.ipAddress}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-900/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-amber-400">Single-instance policy enforced</span>
                    <button
                      type="button"
                      disabled={isSigningOutRemote}
                      onClick={() => handleManualKickRemote(targetActiveSession.employeeId)}
                      className="px-2 py-1 bg-amber-800/80 hover:bg-amber-700 text-slate-900 font-semibold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{isSigningOutRemote ? 'Disconnecting...' : 'Sign Out Other Device'}</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Employee ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. 1346 or 1546"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('FORGOT_PASSWORD');
                        setResetEmpOrEmail(employeeId);
                        setError(null);
                        setResetError(null);
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors shadow-md hover:shadow-sky-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In'}</span>
                  {targetActiveSession && (
                    <span className="text-[10px] opacity-80">(Disconnects Other Instance)</span>
                  )}
                </button>

                <div className="pt-2 text-center border-t border-slate-800/80 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInitialSetupEmpId(employeeId);
                      setInitialSetupError(null);
                      setViewMode('INITIAL_LOGIN');
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-medium flex items-center justify-center gap-1.5 w-full py-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    <span>First-time or Initial Login? Create Your Password</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* MODE: INITIAL LOGIN - CREATE PERSONAL PASSWORD */}
          {viewMode === 'INITIAL_LOGIN' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300 mb-2">
                <button
                  type="button"
                  onClick={() => setViewMode('LOGIN')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Initial Login Setup
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Create your personal password to activate your account
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 text-sky-200 text-xs flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Security Upgrade:</strong> You will create and maintain your own private password.
                </div>
              </div>

              {initialSetupError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <div className="flex-1">{initialSetupError}</div>
                </div>
              )}

              <form onSubmit={handleInitialPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Employee ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={initialSetupEmpId}
                      onChange={(e) => setInitialSetupEmpId(e.target.value)}
                      placeholder="e.g. 1546 or 1346"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  {initialMatchedUser && (
                    <div className="mt-1 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{initialMatchedUser.name} ({initialMatchedUser.department} • {initialMatchedUser.rank || initialMatchedUser.userClass})</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Qatar ID (Identity Verification)
                  </label>
                  <input
                    type="text"
                    value={initialSetupQatarId}
                    onChange={(e) => setInitialSetupQatarId(e.target.value)}
                    placeholder="Enter Qatar ID" required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-base sm:text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Create New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={initialSetupShowNewPass ? 'text' : 'password'}
                      required
                      value={initialSetupNewPass}
                      onChange={(e) => setInitialSetupNewPass(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-base sm:text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setInitialSetupShowNewPass(!initialSetupShowNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {initialSetupShowNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Encrypted with salted bcrypt (cost factor 12) upon submission.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={initialSetupShowConfirmPass ? 'text' : 'password'}
                      required
                      value={initialSetupConfirmPass}
                      onChange={(e) => setInitialSetupConfirmPass(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-base sm:text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setInitialSetupShowConfirmPass(!initialSetupShowConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {initialSetupShowConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('LOGIN')}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Creating Password...' : 'Create Password & Sign In'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE: PASSWORD RESET ASSISTANCE (ADMIN-ONLY PROTOCOL) */}
          {viewMode === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-300 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('LOGIN');
                    setResetError(null);
                    setResetSuccessMsg(null);
                  }}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Password Reset Assistance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Admin-Authorized Credential Reset
                  </p>
                </div>
              </div>

              {/* Security Policy Badge */}
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Self-Service Reset Disabled</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  In accordance with tactical fleet security policy, public password reset links are deactivated to prevent unauthorized account access. Password resets must be verified and issued by a System Administrator.
                </p>
              </div>

              {/* Instructions Box */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs space-y-2">
                <h4 className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>How to Reset Your Account:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                  <li>Submit your Employee ID below to log an assistance request.</li>
                  <li>Contact your Shift Supervisor or System Administrator to verify your identity.</li>
                  <li>The Admin will terminate active sessions and issue a secure temporary password.</li>
                  <li>Sign in with your temporary password; you will be immediately prompted to create your new private password.</li>
                </ol>
              </div>

              {resetSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">{resetSuccessMsg}</div>
                </div>
              )}

              {resetError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <div className="flex-1 text-[11px]">{resetError}</div>
                </div>
              )}

              <form onSubmit={handleRequestAdminReset} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Your Employee ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={resetEmpOrEmail}
                      onChange={(e) => setResetEmpOrEmail(e.target.value)}
                      placeholder="e.g. 1546 or PO-8821"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Operational Note / Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={resetNotes}
                    onChange={(e) => setResetNotes(e.target.value)}
                    placeholder="e.g. Shift changeover, locked out of terminal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('LOGIN');
                      setResetError(null);
                      setResetSuccessMsg(null);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isResetting ? 'Submitting...' : 'Submit Request to Admin'}</span>
                  </button>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('LOGIN');
                      setResetError(null);
                      setResetSuccessMsg(null);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer font-medium flex items-center justify-center gap-1.5 w-full py-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Already received your temporary password? Sign In</span>
                  </button>
                </div>
              </form>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

