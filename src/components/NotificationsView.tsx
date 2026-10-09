import { canApproveRequests } from '../types/drone';
import { AppDropdown } from './AppDropdown';
import React, { useState } from 'react';
import { NotificationMessage, UserItem, NotificationStatus, getUserRole, GroupPrivileges, hasPrivilege } from '../types/drone';
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Wrench,
  Shield,
  ShieldCheck,
  Lock,
  Layers,
  Search,
  Check,
  X,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  Info,
  Trash2,
  User,
  FileSpreadsheet,
  FileText,
  AlertOctagon,
  Camera,
  Filter,
  ChevronDown,
  Download,
} from 'lucide-react';

interface NotificationsViewProps {
  notifications: NotificationMessage[];
  currentUser: UserItem | null;
  users: UserItem[];
  onApprove: (notificationId: string) => void;
  onReject: (notificationId: string, reason?: string) => void;
  onDeleteNotification: (id: string) => void;
  onNavigateToIncident?: (incidentIdOrSr: string) => void;
  groupPrivileges?: GroupPrivileges;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  currentUser,
  users,
  onApprove,
  onReject,
  onDeleteNotification,
  onNavigateToIncident,
  groupPrivileges,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rejection modal state
  const [rejectingNotifId, setRejectingNotifId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<{ url: string; caption?: string; category?: string } | null>(null);

  const isOfficer = canApproveRequests(groupPrivileges,currentUser);
  const canDismiss = hasPrivilege(groupPrivileges, currentUser, 'NOTIFICATIONS_DISMISS_MESSAGE');

  // Helper to determine if the currently logged-in user is the designated officer for a notification
  const isUserDesignatedOfficer = (notif: NotificationMessage): boolean => {
    if (!currentUser) return false;
    const matchId = !!notif.targetOfficerId && (currentUser.id === notif.targetOfficerId || currentUser.employeeId === notif.targetOfficerId);
    const matchEmail = !!notif.targetOfficerEmail && !!currentUser.email && currentUser.email.toLowerCase() === notif.targetOfficerEmail.toLowerCase();
    const matchName = !!notif.targetOfficerName && (
      (!!currentUser.name && notif.targetOfficerName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (!!currentUser.employeeId && notif.targetOfficerName.includes(currentUser.employeeId))
    );
    return isOfficer && matchId;
  };

  // Count tallies
  const pendingCount = notifications.filter((n) => n.status === 'PENDING').length;
  const myAssignedPendingCount = notifications.filter(
    (n) => n.status === 'PENDING' && isUserDesignatedOfficer(n)
  ).length;
  const approvedCount = notifications.filter((n) => n.status === 'APPROVED').length;
  const rejectedCount = notifications.filter((n) => n.status === 'REJECTED').length;

  const filteredNotifications = notifications.filter((n) => {
    // Status / Assignment Filter
    if (filterStatus === 'MY_ACTION') {
      return n.status === 'PENDING' && isUserDesignatedOfficer(n);
    }
    if (filterStatus === 'COMPLETED') {
      return n.status === 'APPROVED' || n.status === 'REJECTED';
    }
    if (filterStatus === 'PENDING' && n.status !== 'PENDING') return false;
    if (filterStatus === 'APPROVED' && n.status !== 'APPROVED') return false;
    if (filterStatus === 'REJECTED' && n.status !== 'REJECTED') return false;
    if (filterStatus === 'SYSTEM' && n.type !== 'SYSTEM_MESSAGE') return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchMsg = n.message.toLowerCase().includes(term);
      const matchSender = n.senderName.toLowerCase().includes(term) || n.senderEmail.toLowerCase().includes(term);
      const matchTarget = n.targetOfficerName.toLowerCase().includes(term) || n.targetOfficerEmail.toLowerCase().includes(term);
      const matchItem = n.changeDetails ? n.changeDetails.itemIdentifier.toLowerCase().includes(term) : false;
      const matchHof = n.handoverForm ? `${n.handoverForm.srNumber} ${n.handoverForm.recipientName} ${n.handoverForm.purpose}`.toLowerCase().includes(term) : false;
      const matchInc = n.incidentReport ? `${n.incidentReport.srReference} ${n.incidentReport.droneName} ${n.incidentReport.location || ''} ${n.incidentReport.detailsSummary}`.toLowerCase().includes(term) : false;
      return matchTitle || matchMsg || matchSender || matchTarget || matchItem || matchHof || matchInc;
    }
    return true;
  });

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingNotifId) return;
    onReject(rejectingNotifId, rejectionReason.trim());
    setRejectingNotifId(null);
    setRejectionReason('');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Type', 'Status', 'Title', 'Sender Name', 'Sender Email', 'Target Officer', 'Message'];
    const rows = filteredNotifications.map((n) => [
      `"${n.id}"`,
      `"${n.timestamp}"`,
      `"${n.type}"`,
      `"${n.status}"`,
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.senderName.replace(/"/g, '""')}"`,
      `"${n.senderEmail}"`,
      `"${(n.targetOfficerName || '').replace(/"/g, '""')}"`,
      `"${n.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notifications_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: NotificationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <Clock className="w-3 h-3 text-amber-400" />
            <span>PENDING APPROVAL</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>APPROVED</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>REJECTED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Info className="w-3 h-3 text-slate-400" />
            <span>SYSTEM NOTICE</span>
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INCIDENT_APPROVAL_REQUEST':
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'INCIDENT_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'INCIDENT_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'HANDOVER_APPROVAL_REQUEST':
        return <FileSpreadsheet className="w-4 h-4 text-cyan-400" />;
      case 'HANDOVER_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'HANDOVER_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'CHANGE_APPROVAL_REQUEST':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'CHANGE_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'CHANGE_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* KPI Tally Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* TOTAL MESSAGES */}
        <div 
          onClick={() => setFilterStatus('all')}
          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
            filterStatus === 'all' ? 'border-sky-500/80 bg-slate-800/60 shadow-xs' : 'border-slate-800 hover:border-slate-700'
          }`}
          title="Click to view all notification messages"
        >
          <div className="text-slate-400 text-xs font-medium mb-1 flex items-center justify-between">
            <span>TOTAL MESSAGES</span>
            <span className="text-[10px] text-sky-400">View →</span>
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-100">
            {notifications.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Notification Inbox</div>
        </div>

        {/* REQUIRES MY ACTION */}
        <div 
          onClick={() => {
            if (isOfficer) setFilterStatus('MY_ACTION');
            else setFilterStatus('PENDING');
          }}
          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
            filterStatus === 'MY_ACTION' ? 'border-amber-500/80 bg-amber-950/20 shadow-xs' : 'border-slate-800 hover:border-amber-500/60'
          }`}
          title="Click to view requests assigned to you"
        >
          <div className="text-amber-400 text-xs font-medium mb-1 flex items-center justify-between">
            <span>REQUIRES MY ACTION</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-amber-400">
            {myAssignedPendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{isOfficer ? 'Designated to you' : 'None (Technician)'}</span>
            <span className="text-[10px] text-amber-400">Filter →</span>
          </div>
        </div>

        {/* ALL PENDING */}
        <div 
          onClick={() => setFilterStatus('PENDING')}
          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
            filterStatus === 'PENDING' ? 'border-sky-500/80 bg-sky-950/20 shadow-xs' : 'border-slate-800 hover:border-sky-500/60'
          }`}
          title="Click to view pending requests"
        >
          <div className="text-sky-400 text-xs font-medium mb-1 flex items-center justify-between">
            <span>ALL PENDING</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-sky-400">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Awaiting designated officers</span>
            <span className="text-[10px] text-sky-400">Filter →</span>
          </div>
        </div>

        {/* COMPLETED ACTIONS */}
        <div 
          onClick={() => setFilterStatus('COMPLETED')}
          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
            filterStatus === 'COMPLETED' || filterStatus === 'APPROVED' || filterStatus === 'REJECTED'
              ? 'border-emerald-500/80 bg-emerald-950/20 shadow-xs'
              : 'border-slate-800 hover:border-emerald-500/60'
          }`}
          title="Click to view completed and signed-off actions"
        >
          <div className="text-emerald-400 text-xs font-medium mb-1 flex items-center justify-between">
            <span>COMPLETED ACTIONS</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-emerald-400">
            {approvedCount + rejectedCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{approvedCount} approved, {rejectedCount} rejected</span>
            <span className="text-[10px] text-emerald-400">Filter →</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 w-full"
      >
        {/* Left: Search (First Option) + Filter Status Dropdown */}
        <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
          {/* Compact Search Input - First option left-most */}
          <div className="relative w-full sm:w-52 md:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notifications..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            Filter:
          </span>
          <div className="relative shrink-0">
            <AppDropdown
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 cursor-pointer appearance-none shadow-xs font-medium"
            >
              <option value="all">All Messages ({notifications.length})</option>
              {isOfficer && (
                <option value="MY_ACTION">Assigned to Me ({myAssignedPendingCount})</option>
              )}
              <option value="PENDING">Pending Approvals ({pendingCount})</option>
              <option value="COMPLETED">Completed Actions ({approvedCount + rejectedCount})</option>
              <option value="APPROVED">Approved ({approvedCount})</option>
              <option value="REJECTED">Rejected ({rejectedCount})</option>
              <option value="SYSTEM">System Notices</option>
            </AppDropdown>
          </div>
        </div>

        {/* Right: Quick Action Badges + Export CSV */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-end xl:self-auto">
          {/* Assigned to Me quick button if officer and has pending items */}
          {isOfficer && myAssignedPendingCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'MY_ACTION' ? 'all' : 'MY_ACTION')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap ${
                filterStatus === 'MY_ACTION'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/70 border border-amber-800/80'
              }`}
              title="Filter to requests assigned to you"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Assigned to Me ({myAssignedPendingCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            title="Export notifications to CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No Messages Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no notifications matching your current filter criteria.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isDesignated = isUserDesignatedOfficer(notif);

            const isHandover = notif.type === 'HANDOVER_APPROVAL_REQUEST' || !!notif.handoverForm;
            const isIncident = notif.type === 'INCIDENT_APPROVAL_REQUEST' || !!notif.incidentReport;

            return (
              <div
                key={notif.id}
                className={`bg-slate-900 border rounded-xl p-5 transition-all shadow-md ${
                  notif.status === 'PENDING'
                    ? isDesignated
                      ? 'border-emerald-500/60 bg-slate-900/95 ring-1 ring-emerald-500/30 shadow-emerald-500/5'
                      : isIncident
                      ? 'border-rose-500/50 bg-slate-900/90'
                      : 'border-amber-500/40 bg-slate-900/90'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Message Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                      {getTypeIcon(notif.type)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-100 text-sm">
                          {notif.title}
                        </h3>
                        {getStatusBadge(notif.status)}
                        {notif.status === 'PENDING' && isDesignated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>YOU ARE THE DESIGNATED APPROVER</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{notif.timestamp}</span>
                        <span>•</span>
                        <span className="text-slate-400">ID: {notif.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {canDismiss ? (
                      <button
                        onClick={() => onDeleteNotification(notif.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Dismiss message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span
                        className="p-1.5 text-slate-700 cursor-not-allowed opacity-40 inline-flex items-center"
                        title="Dismiss message: Permission restricted by Group Permissions policy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="py-3 text-xs text-slate-300 leading-relaxed">
                  {notif.message}
                </div>

                {/* Personnel Routing Badge (Sender & Target Officer) */}
                <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-lg bg-slate-950/70 border border-slate-800/70 text-xs">
                  {/* Sender */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      From {notif.senderClass === 'TECHNICIAN' ? 'Technician' : 'Officer'}:
                    </span>
                    <div className="flex items-center gap-1 text-slate-200 font-medium">
                      {notif.senderClass === 'TECHNICIAN' ? (
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-sky-400" />
                      )}
                      <span>{notif.senderName}</span>
                      <span className="text-[10px] font-mono text-slate-500">({notif.senderEmail})</span>
                    </div>
                  </div>

                  <span className="text-slate-700 hidden sm:inline">•</span>

                  {/* Designated Target Officer */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Designated Approving Officer:</span>
                    </span>
                    <div className="flex items-center gap-1 text-sky-300 font-medium">
                      <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                      <strong className="text-sky-300">{notif.targetOfficerName}</strong>
                      <span className="text-[10px] font-mono text-sky-500/80">({notif.targetOfficerEmail})</span>
                    </div>
                  </div>
                </div>

                {/* HANDOVER FORM DETAILS BREAKDOWN (if attached) */}
                {notif.handoverForm && (
                  <div className="mt-3 p-3.5 bg-slate-950/90 border border-slate-800/90 rounded-lg space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-cyan-400">
                          HANDOVER SHEET: {notif.handoverForm.srNumber}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300">
                          Recipient: <strong>{notif.handoverForm.recipientName}</strong> ({notif.handoverForm.recipientJobId})
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        DATE: {notif.handoverForm.date}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      <span className="text-slate-500 font-mono">Mission:</span> {notif.handoverForm.purpose}
                    </div>

                    {/* Equipment list */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">
                        Assigned Equipment & Accessories:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(notif.handoverForm.equipment || [])
                          .filter((e) => e.description || e.serialNumber)
                          .map((e, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono"
                            >
                              <span className="text-slate-300 truncate max-w-[180px]">{e.description}</span>
                              <span className="text-cyan-400 font-semibold">{e.serialNumber}</span>
                            </div>
                          ))}
                        {(notif.handoverForm.accessories || [])
                          .filter((a) => a.description || a.qty)
                          .map((a, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono"
                            >
                              <span className="text-slate-300 truncate max-w-[180px]">{a.description}</span>
                              <span className="text-amber-400 font-bold">Qty: {a.qty}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Incident Report Document Breakdown */}
                {notif.incidentReport && (
                  <div className="mt-3 p-3.5 bg-slate-950/90 border border-rose-900/60 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono border-b border-rose-900/40 pb-2">
                      <div className="flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-bold text-rose-400">
                          INCIDENT REPORT: {notif.incidentReport.srReference}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-200">
                          Asset: <strong className="text-sky-400">{notif.incidentReport.droneName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                          STATUS: {notif.incidentReport.markDroneStatus || notif.incidentReport.status}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          SEVERITY: {notif.incidentReport.severity}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-500 text-[10px] block">AIRCRAFT / SERIAL:</span>
                        <span className="text-slate-200 font-bold truncate block">{notif.incidentReport.aircraftSN}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">LOCATION:</span>
                        <span className="text-amber-300 font-semibold truncate block">{notif.incidentReport.location || 'MUAITHER'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">DATE & TIME:</span>
                        <span className="text-slate-300 truncate block">
                          {notif.incidentReport.date} {notif.incidentReport.logTime ? `· ${notif.incidentReport.logTime}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">REPORTED BY:</span>
                        <span className="text-cyan-400 font-semibold truncate block">{notif.incidentReport.reportedBy}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 font-mono font-semibold block mb-0.5">
                        Incident Narrative / Damage & Loss Summary:
                      </span>
                      <p className="leading-relaxed font-mono text-[10.5px] text-slate-200">
                        {notif.incidentReport.detailsSummary}
                      </p>
                    </div>

                    {/* Supporting Evidence Photos in Notification */}
                    {notif.incidentReport.photos && notif.incidentReport.photos.length > 0 && (
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Attached Supporting Evidence & Photographic Logs ({notif.incidentReport.photos.length}):</span>
                          </span>
                          <span className="text-[10px] text-slate-500">(Click image to enlarge)</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {notif.incidentReport.photos.map((photo) => (
                            <div
                              key={photo.id}
                              onClick={() => setPreviewPhotoUrl({ url: photo.dataUrl, caption: photo.caption, category: photo.category })}
                              className="rounded-lg bg-black/60 border border-slate-800 overflow-hidden cursor-pointer hover:border-cyan-500/70 transition-all group"
                              title={photo.caption || photo.category}
                            >
                              <div className="aspect-16/9 overflow-hidden flex items-center justify-center bg-black">
                                <img
                                  src={photo.dataUrl}
                                  alt={photo.fileName}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <p className="text-[9px] font-mono text-slate-300 px-1.5 py-1 truncate bg-slate-950/80 border-t border-slate-800/60">
                                {photo.category}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {onNavigateToIncident && (
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => onNavigateToIncident(notif.incidentReport!.id || notif.incidentReport!.srReference)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/70 border border-rose-800/80 hover:bg-rose-900/80 hover:text-rose-200 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                          <span>Open Official Incident Accident Report Sheet →</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Proposed Change Details Breakdown (for Fleet inventory) */}
                {notif.changeDetails && !notif.handoverForm && !notif.incidentReport && (
                  <div className="mt-3 p-3.5 bg-slate-950/90 border border-slate-800/90 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-slate-400 font-semibold">
                          ITEM: <span className="text-slate-100">{notif.changeDetails.itemType} · {notif.changeDetails.itemIdentifier}</span>
                        </span>
                      </div>
                      <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                        ACTION: {notif.changeDetails.action}
                      </span>
                    </div>

                    {/* Field diffs comparison */}
                    {notif.changeDetails.diffs && notif.changeDetails.diffs.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {notif.changeDetails.diffs.map((diff, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded border border-slate-800 text-[11px] font-mono"
                          >
                            <span className="text-slate-400 font-medium">{diff.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-rose-400 line-through">
                                {String(diff.oldValue || 'None')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-600" />
                              <span className="text-emerald-400 font-bold">
                                {String(diff.newValue || 'None')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] text-slate-400 font-mono">
                          Summary: <span className="text-slate-200">{notif.changeDetails.summary}</span>
                        </div>
                        {notif.changeDetails.itemType === 'USER' && notif.changeDetails.proposedData && (
                          <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Personnel Name:</span>
                              <span className="text-slate-100 font-bold">{notif.changeDetails.proposedData.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Emp ID / QID:</span>
                              <span className="text-sky-400 font-bold">{notif.changeDetails.proposedData.employeeId} · {notif.changeDetails.proposedData.qatarId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Rank / Group:</span>
                              <span className="text-amber-400 font-semibold">{notif.changeDetails.proposedData.rank || '—'} ({notif.changeDetails.proposedData.userRole || notif.changeDetails.proposedData.userClass || 'OFFICER'})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Department:</span>
                              <span className="text-slate-200">{notif.changeDetails.proposedData.department}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Contact / Email:</span>
                              <span className="text-slate-300">{notif.changeDetails.proposedData.mobileNumber} · {notif.changeDetails.proposedData.email}</span>
                            </div>
                          </div>
                        )}
                        {notif.changeDetails.itemType === 'BATCH_DRONES' && notif.changeDetails.proposedData && (
                          <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono space-y-2">
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Batch Airframes: <strong className="text-sky-400 font-bold">{notif.changeDetails.proposedData.drones?.length || 0} Drones</strong></span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
                                {notif.changeDetails.proposedData.replaceAll ? 'REPLACE FLEET' : 'APPEND TO FLEET'}
                              </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {(notif.changeDetails.proposedData.drones || []).slice(0, 10).map((d: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded border border-slate-800/80 text-[10px]">
                                  <span className="text-slate-200 font-sans">{d.droneName || d.model}</span>
                                  <span className="text-sky-400 font-semibold">{d.droneSN}</span>
                                  <span className="text-slate-400">{d.department}</span>
                                </div>
                              ))}
                              {(notif.changeDetails.proposedData.drones?.length || 0) > 10 && (
                                <div className="text-[10px] text-slate-500 text-center italic">
                                  + {(notif.changeDetails.proposedData.drones?.length || 0) - 10} more airframes in this upload batch
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Review History Banner for Approved or Rejected */}
                {notif.status === 'APPROVED' && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span>Officially approved by designated officer <strong>{notif.reviewedBy || notif.targetOfficerName}</strong> on {notif.reviewedAt || 'recently'}.</span>
                      <span className="text-emerald-400/80 block text-[11px] mt-0.5">
                        {isHandover ? 'Handover form was officially signed and issued to recipient.' : 'Inventory data was verified and updated.'}
                      </span>
                    </div>
                  </div>
                )}

                {notif.status === 'REJECTED' && (
                  <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span>Declined by designated officer <strong>{notif.reviewedBy || notif.targetOfficerName}</strong> on {notif.reviewedAt || 'recently'}.</span>
                      {notif.reviewComment && (
                        <p className="text-[11px] text-rose-200 mt-1 italic font-sans">
                          Reason: "{notif.reviewComment}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Section for Pending Requests */}
                {notif.status === 'PENDING' && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    {/* CASE 1: The current user is the DESIGNATED APPROVING OFFICER */}
                    {isDesignated ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg">
                        <div className="text-xs text-emerald-300 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Authority Verified:</strong> You are the designated approving officer. Review the items above to authorize and issue custody or decline.
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => {
                              setRejectingNotifId(notif.id);
                              setRejectionReason('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/80 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isIncident ? 'Reject Incident' : isHandover ? 'Reject Form' : notif.changeDetails?.itemType === 'USER' ? 'Decline Personnel' : 'Reject Change'}</span>
                          </button>
                          <button
                            disabled={notif.changeDetails?.itemType==='USER'}
                            title={notif.changeDetails?.itemType==='USER'?'Manage this account directly in Users and decline the old request':undefined}
                            onClick={() => onApprove(notif.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isIncident ? 'Approve & Sign Off Incident Report' : isHandover ? 'Approve & Issue Form (UAV Team)' : notif.changeDetails?.itemType === 'USER' ? 'Manage in Users' : 'Approve & Apply Change'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* CASE 2: The current user is NOT the designated officer */
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg text-xs">
                        <div className="text-slate-400 flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-slate-300 font-medium">
                              Approval Restricted to Designated Officer:
                            </span>{' '}
                            <span>
                              Only <strong className="text-sky-300">{notif.targetOfficerName}</strong> ({notif.targetOfficerEmail}) is authorized to approve and {isIncident ? 'evaluate and sign off on this incident report' : isHandover ? 'issue this form' : notif.changeDetails?.itemType === 'USER' ? 'authorize this personnel registration' : 'apply this change'}.
                            </span>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              You are currently viewing as <span className="font-semibold text-slate-300">{currentUser?.name}</span> ({getUserRole(currentUser)}).
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Rejection Note Modal */}
      {rejectingNotifId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Reject Request</span>
              </h3>
              <button
                onClick={() => setRejectingNotifId(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  REJECTION REASON / REMARKS FOR DISPATCHER
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Unit must undergo secondary inspection before status transition. Re-test battery cell 3."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectingNotifId(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-rose-600 hover:bg-rose-500 rounded transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forensic Photo Zoom Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-950">
              <span className="font-mono font-bold text-cyan-400">
                {previewPhotoUrl.category || 'Incident Evidence Photo'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black overflow-auto max-h-[75vh]">
              <img
                src={previewPhotoUrl.url}
                alt="Incident forensic asset"
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>
            {previewPhotoUrl.caption && (
              <div className="p-3 border-t border-slate-800 text-xs text-slate-300 font-mono bg-slate-950">
                {previewPhotoUrl.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

