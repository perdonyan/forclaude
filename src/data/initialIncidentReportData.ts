import { IncidentReportRecord, IncidentPhotoAttachment } from '../types/drone';

// High-fidelity SVG-based evidentiary graphic data URLs for initial demonstration
const CRASH_PHOTO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" stroke-width="0.8" stroke-opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="800" height="500" fill="url(#bgGrad)"/>
  <rect width="800" height="500" fill="url(#grid)"/>

  <!-- Telemetry HUD Overlay -->
  <rect x="25" y="25" width="750" height="450" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>
  <circle cx="400" cy="250" r="140" fill="none" stroke="#ef4444" stroke-width="1" opacity="0.4"/>
  <line x1="260" y1="250" x2="540" y2="250" stroke="#ef4444" stroke-width="1" opacity="0.4"/>
  <line x1="400" y1="110" x2="400" y2="390" stroke="#ef4444" stroke-width="1" opacity="0.4"/>

  <!-- Damaged Drone Arm & Propeller Wireframe Simulation -->
  <g transform="translate(400, 250)">
    <!-- Fuselage Body -->
    <path d="M -70 -50 L 70 -50 L 50 60 L -50 60 Z" fill="#475569" stroke="#94a3b8" stroke-width="3"/>
    <rect x="-30" y="-30" width="60" height="60" rx="6" fill="#334155" stroke="#cbd5e1" stroke-width="2"/>
    <text x="0" y="5" font-family="monospace" font-size="12" fill="#38bdf8" text-anchor="middle" font-weight="bold">DJI M30T</text>

    <!-- Intact Arm Front Left -->
    <line x1="-60" y1="-45" x2="-190" y2="-120" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
    <circle cx="-190" cy="-120" r="18" fill="#334155" stroke="#22c55e" stroke-width="3"/>
    
    <!-- Intact Arm Front Right -->
    <line x1="60" y1="-45" x2="190" y2="-120" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
    <circle cx="190" cy="-120" r="18" fill="#334155" stroke="#22c55e" stroke-width="3"/>

    <!-- Intact Arm Rear Left -->
    <line x1="-50" y1="50" x2="-180" y2="130" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
    <circle cx="-180" cy="130" r="18" fill="#334155" stroke="#22c55e" stroke-width="3"/>

    <!-- DAMAGED ARM Rear Right (Impact Zone) -->
    <line x1="50" y1="50" x2="130" y2="90" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
    <!-- Fracture Crack Mark -->
    <path d="M 130 90 L 140 105 L 135 115 L 155 125" stroke="#fca5a5" stroke-width="3" fill="none"/>
    <line x1="155" y1="125" x2="175" y2="135" stroke="#dc2626" stroke-width="6" stroke-linecap="round" stroke-dasharray="8,4"/>
    
    <!-- Broken Rotor Blade -->
    <circle cx="175" cy="135" r="18" fill="#991b1b" stroke="#ef4444" stroke-width="3"/>
    <line x1="175" y1="135" x2="225" y2="105" stroke="#f87171" stroke-width="4" stroke-linecap="round"/>
    <line x1="175" y1="135" x2="145" y2="165" stroke="#f87171" stroke-width="3" stroke-dasharray="4,4"/>

    <!-- Impact Callout Tag -->
    <g transform="translate(180, 70)">
      <rect x="0" y="-24" width="165" height="32" rx="4" fill="#7f1d1d" stroke="#ef4444" stroke-width="1.5"/>
      <text x="10" y="-4" font-family="sans-serif" font-size="11" fill="#fecaca" font-weight="bold">CRASH IMPACT ZONE #4</text>
      <line x1="0" y1="8" x2="-10" y2="40" stroke="#ef4444" stroke-width="1.5"/>
    </g>
  </g>

  <!-- Technical Overlay Labels -->
  <g transform="translate(45, 60)" font-family="monospace">
    <text x="0" y="0" font-size="13" fill="#ef4444" font-weight="bold">⚠ FORENSIC ACCIDENT EVIDENCE</text>
    <text x="0" y="20" font-size="11" fill="#94a3b8">SECTOR: MUAITHER [ZONE 53]</text>
    <text x="0" y="38" font-size="11" fill="#94a3b8">INCIDENT REF: UAV-IAR-2026-01</text>
    <text x="0" y="56" font-size="11" fill="#94a3b8">ASSET: M30T-29 [SN: 1581F5BKD23910OFJSNJ]</text>
  </g>

  <g transform="translate(45, 430)" font-family="monospace">
    <text x="0" y="0" font-size="11" fill="#38bdf8">ALTITUDE AT FAILURE: 24.8m AGL</text>
    <text x="0" y="18" font-size="11" fill="#fbbf24">STATUS: MOTOR #4 ROTOR BLADE DELAMINATION & BOOM STRUCTURAL FRACTURE</text>
  </g>

  <g transform="translate(560, 430)" font-family="monospace">
    <text x="0" y="0" font-size="11" fill="#94a3b8">EVIDENCE ID: EVD-001-HARDWARE</text>
    <text x="0" y="18" font-size="11" fill="#cbd5e1">DATE: 13-MAY-2026 14:42 UTC+3</text>
  </g>
</svg>
`)}`;

const BATTERY_FRAME_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#181e29"/>
      <stop offset="100%" stop-color="#0b0f17"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bayGrad)"/>

  <!-- Battery Pack Diagram -->
  <g transform="translate(220, 80)">
    <!-- Battery TB30 Slot 1 -->
    <rect x="0" y="0" width="160" height="280" rx="10" fill="#1e293b" stroke="#475569" stroke-width="3"/>
    <rect x="20" y="30" width="120" height="180" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
    <text x="80" y="60" font-family="sans-serif" font-size="14" fill="#38bdf8" text-anchor="middle" font-weight="bold">TB30 PACK #1</text>
    <circle cx="80" cy="110" r="28" fill="#1e293b" stroke="#22c55e" stroke-width="3"/>
    <text x="80" y="115" font-family="monospace" font-size="13" fill="#22c55e" text-anchor="middle" font-weight="bold">92%</text>
    <text x="80" y="160" font-family="monospace" font-size="10" fill="#94a3b8" text-anchor="middle">CELL STATUS: NORMAL</text>
    <text x="80" y="180" font-family="monospace" font-size="10" fill="#94a3b8" text-anchor="middle">VOLTAGE: 26.2V</text>
    <!-- Latch mechanism intact -->
    <rect x="40" y="240" width="80" height="24" rx="4" fill="#15803d" stroke="#22c55e" stroke-width="1.5"/>
    <text x="80" y="256" font-family="sans-serif" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold">LATCH LOCKED</text>

    <!-- Battery TB30 Slot 2 (Stress Impacted) -->
    <rect x="200" y="0" width="160" height="280" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="3"/>
    <rect x="220" y="30" width="120" height="180" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
    <text x="280" y="60" font-family="sans-serif" font-size="14" fill="#f59e0b" text-anchor="middle" font-weight="bold">TB30 PACK #2</text>
    <circle cx="280" cy="110" r="28" fill="#1e293b" stroke="#eab308" stroke-width="3"/>
    <text x="280" y="115" font-family="monospace" font-size="13" fill="#eab308" text-anchor="middle" font-weight="bold">88%</text>
    <text x="280" y="160" font-family="monospace" font-size="10" fill="#f59e0b" text-anchor="middle">CELL SWELLING: NONE</text>
    <text x="280" y="180" font-family="monospace" font-size="10" fill="#cbd5e1" text-anchor="middle">MINOR SCUFF ON LIP</text>
    <!-- Latch mechanism -->
    <rect x="240" y="240" width="80" height="24" rx="4" fill="#854d0e" stroke="#eab308" stroke-width="1.5"/>
    <text x="280" y="256" font-family="sans-serif" font-size="10" fill="#fef08a" text-anchor="middle" font-weight="bold">INSPECTED OK</text>
  </g>

  <!-- Title & Inspection Data -->
  <g transform="translate(45, 50)" font-family="monospace">
    <text x="0" y="0" font-size="14" fill="#f59e0b" font-weight="bold">🔍 AIRFRAME & POWER INTEGRITY INSPECTION</text>
    <text x="0" y="20" font-size="11" fill="#94a3b8">COMPARTMENT: DUAL INTELLIGENT FLIGHT BATTERY BAY (M30T)</text>
    <text x="0" y="38" font-size="11" fill="#94a3b8">OBSERVATION: NO THERMAL RUNAWAY, NO CHEMICAL LEAKAGE DETECTED</text>
  </g>

  <g transform="translate(45, 420)" font-family="monospace">
    <text x="0" y="0" font-size="11" fill="#38bdf8">INSPECTOR: TECH. SPECIALIST M. BASAYSAY (ID: adm-1001)</text>
    <text x="0" y="18" font-size="11" fill="#94a3b8">CONCLUSION: BATTERIES CLEARED FOR QUARANTINE CYCLING; CHASSIS BOOM REQUIRES MOUNT REPLACEMENT</text>
  </g>
</svg>
`)}`;

const LOG_SHEET_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="logBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#logBg)"/>

  <!-- Telemetry Log Header -->
  <rect x="40" y="30" width="720" height="45" fill="#1e293b" rx="4"/>
  <text x="60" y="58" font-family="monospace" font-size="13" fill="#38bdf8" font-weight="bold">BLACKBOX TELEMETRY LOG EXCERPT • FLIGHT RECORD #FR-20260513-09</text>
  <text x="730" y="58" font-family="monospace" font-size="12" fill="#ef4444" text-anchor="end" font-weight="bold">SYNC LOSS DETECTED</text>

  <!-- Table Header -->
  <g transform="translate(40, 95)" font-family="monospace" font-size="11" fill="#94a3b8">
    <rect x="0" y="0" width="720" height="28" fill="#0f172a"/>
    <text x="15" y="18" font-weight="bold">UTC TIME</text>
    <text x="120" y="18" font-weight="bold">ALT(m)</text>
    <text x="180" y="18" font-weight="bold">SPD(m/s)</text>
    <text x="250" y="18" font-weight="bold">VOLT(V)</text>
    <text x="320" y="18" font-weight="bold">MOT#1</text>
    <text x="390" y="18" font-weight="bold">MOT#2</text>
    <text x="460" y="18" font-weight="bold">MOT#3</text>
    <text x="530" y="18" font-weight="bold">MOT#4</text>
    <text x="605" y="18" font-weight="bold">FLIGHT EVENT</text>
  </g>

  <!-- Log Rows -->
  <g transform="translate(40, 130)" font-family="monospace" font-size="11">
    <!-- Row 1 -->
    <text x="15" y="16" fill="#cbd5e1">11:42:15.102</text>
    <text x="120" y="16" fill="#cbd5e1">24.8</text>
    <text x="180" y="16" fill="#cbd5e1">8.4</text>
    <text x="250" y="16" fill="#cbd5e1">25.8</text>
    <text x="320" y="16" fill="#4ade80">5120</text>
    <text x="390" y="16" fill="#4ade80">5110</text>
    <text x="460" y="16" fill="#4ade80">5140</text>
    <text x="530" y="16" fill="#4ade80">5130</text>
    <text x="605" y="16" fill="#4ade80">P-GPS WAYPOINT_TRACK</text>

    <!-- Row 2 -->
    <text x="15" y="42" fill="#cbd5e1">11:42:16.420</text>
    <text x="120" y="42" fill="#cbd5e1">24.8</text>
    <text x="180" y="42" fill="#cbd5e1">8.2</text>
    <text x="250" y="42" fill="#cbd5e1">25.7</text>
    <text x="320" y="42" fill="#4ade80">5150</text>
    <text x="390" y="42" fill="#4ade80">5140</text>
    <text x="460" y="42" fill="#4ade80">5180</text>
    <text x="530" y="42" fill="#4ade80">5160</text>
    <text x="605" y="42" fill="#fbbf24">OBSTACLE_PROXIMITY_WARN</text>

    <!-- Row 3 (IMPACT CRITICAL) -->
    <rect x="0" y="56" width="720" height="30" fill="#7f1d1d" opacity="0.6"/>
    <text x="15" y="76" fill="#fecaca" font-weight="bold">11:42:17.085</text>
    <text x="120" y="76" fill="#fecaca">24.6</text>
    <text x="180" y="76" fill="#fecaca">2.1</text>
    <text x="250" y="76" fill="#fecaca">25.1</text>
    <text x="320" y="76" fill="#fecaca">6820</text>
    <text x="390" y="76" fill="#fecaca">6790</text>
    <text x="460" y="76" fill="#fecaca">6900</text>
    <text x="530" y="76" fill="#f87171" font-weight="bold">0 [STALL]</text>
    <text x="605" y="76" fill="#fecaca" font-weight="bold">⚠ MOTOR_OVERLOAD_CUTOFF</text>

    <!-- Row 4 -->
    <rect x="0" y="90" width="720" height="30" fill="#450a0a" opacity="0.5"/>
    <text x="15" y="110" fill="#fca5a5">11:42:17.310</text>
    <text x="120" y="110" fill="#fca5a5">23.9</text>
    <text x="180" y="110" fill="#fca5a5">0.4</text>
    <text x="250" y="110" fill="#fca5a5">24.9</text>
    <text x="320" y="110" fill="#fca5a5">7100</text>
    <text x="390" y="110" fill="#fca5a5">7120</text>
    <text x="460" y="110" fill="#fca5a5">7080</text>
    <text x="530" y="110" fill="#ef4444" font-weight="bold">0 [ERR_04]</text>
    <text x="605" y="110" fill="#f87171" font-weight="bold">AUTO_EMERGENCY_DESCENT</text>

    <!-- Row 5 -->
    <text x="15" y="144" fill="#cbd5e1">11:42:24.890</text>
    <text x="120" y="144" fill="#cbd5e1">0.0</text>
    <text x="180" y="144" fill="#cbd5e1">0.0</text>
    <text x="250" y="144" fill="#cbd5e1">24.8</text>
    <text x="320" y="144" fill="#64748b">0</text>
    <text x="390" y="144" fill="#64748b">0</text>
    <text x="460" y="144" fill="#64748b">0</text>
    <text x="530" y="144" fill="#64748b">0</text>
    <text x="605" y="144" fill="#38bdf8">TOUCHDOWN_COMM_SECURED</text>
  </g>

  <!-- Graph Curve Simulation -->
  <g transform="translate(40, 310)">
    <rect x="0" y="0" width="720" height="130" fill="#0b1120" rx="4" stroke="#1e293b"/>
    <text x="15" y="22" font-family="monospace" font-size="11" fill="#94a3b8">RPM TRACE: MOTOR #4 SUDDEN ARREST AT 11:42:17.085</text>
    <path d="M 15 80 L 150 78 L 300 77 L 420 75 L 440 20 L 450 115 L 700 115" fill="none" stroke="#ef4444" stroke-width="2.5"/>
    <circle cx="440" cy="20" r="4" fill="#ef4444"/>
    <text x="450" y="25" font-family="monospace" font-size="10" fill="#fca5a5">IMPACT PEAK</text>
  </g>
</svg>
`)}`;

export const INITIAL_INCIDENT_REPORTS: IncidentReportRecord[] = [
  {
    id: 'iar-2026-001',
    srReference: 'UAV-IAR-2026-01',
    droneId: '85',
    droneName: 'M30T-29',
    aircraftSN: '1581F5BKD23910OFJSNJ',
    remoteSN: '4LFCL8L006KDPK',
    location: 'MUAITHER',
    date: '13/05/2026',
    department: 'SSOC',
    severity: 'CRITICAL',
    status: 'UNDER_INVESTIGATION',
    reportedBy: 'Capt. Tariq Al-Kuwari',
    reporterId: 'adm-1001',
    detailsSummary:
      'During the execution of an operational mission flight, the aircraft encountered severe, localized GNSS and GPS telemetry signal instabilities. Due to this external environmental degradation, critical RF link connectivity between the airframe and the remote controller was lost. Consequently, the drone became completely uncontrollable, failed to trigger safe-return failsafes, and disconnected fully from the ground control station terminal before impacting terrain.',
    latitude: '25.25130140833998',
    longitude: '51.39657338652925',
    operatorName: 'محمد على المرى',
    operatorQid: '2896348',
    operatorPhone: '777770',
    operatorJobId: '1346 - SSOC',
    operatorSignature: '✍ محمد على المرى',
    logDate: '13/05/2026',
    logTime: '23:47',
    reportPreparedBy: 'Capt. Tariq Al-Kuwari',
    reviewDate: '14/05/2026',
    evaluationStatus: 'HARDWARE DISCONNECTED / LOST',
    receivedEvaluatedBy: 'Capt. Tariq Al-Kuwari',
    evalDateTime: '14/05/2026 | 08:30 AM',
    fieldSystemNotes:
      'Northern sector reconnaissance mission compromised due to terminal link degradation. Airframe impact area mapped via last available GPS positioning vectors. Emergency recovery protocols initiated. Flight logs downloaded up to telemetry loss frame; hardware structural review pending physical wreckage extraction.',
    photos: [
      {
        id: 'photo-001',
        dataUrl: CRASH_PHOTO_SVG,
        fileName: 'crash_impact_rear_boom.png',
        category: 'Hardware Crash Photo',
        caption: 'Hardware Airframe Crash Photo Placeholder',
        uploadedAt: '2026-05-13T14:45:00.000Z',
        fileSize: 245000,
      },
      {
        id: 'photo-002',
        dataUrl: BATTERY_FRAME_SVG,
        fileName: 'battery_bay_inspection.png',
        category: 'Drone Battery & Frame Imagery',
        caption: 'Drone Physical Battery & Degradation Imagery Placeholder',
        uploadedAt: '2026-05-13T14:52:00.000Z',
        fileSize: 198000,
      },
      {
        id: 'photo-003',
        dataUrl: LOG_SHEET_SVG,
        fileName: 'flight_telemetry_blackbox.png',
        category: 'Detailed Log Sheet Excerpt',
        caption: 'Detailed Ground Control Station Log Excerpt Placeholder',
        uploadedAt: '2026-05-13T15:10:00.000Z',
        fileSize: 312000,
      },
    ],
    createdAt: '2026-05-13T15:00:00.000Z',
    updatedAt: '2026-05-13T16:20:00.000Z',
  },
];
