import { ConfiscatedDroneReport } from '../types/drone';

// High-fidelity official Ministry of Interior Correspondence Letter SVG Data URL
export const SAMPLE_CORRESPONDENCE_LETTER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100">
  <rect width="800" height="1100" fill="#ffffff"/>
  <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#6b1119" stroke-width="2"/>
  <rect x="30" y="30" width="740" height="1040" fill="none" stroke="#6b1119" stroke-width="0.5"/>
  
  <!-- Header Banner -->
  <text x="400" y="70" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="20" font-weight="bold" fill="#6b1119" text-anchor="middle">STATE OF QATAR · MINISTRY OF INTERIOR</text>
  <text x="400" y="95" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="16" font-weight="600" fill="#333333" text-anchor="middle">GENERAL DIRECTORATE OF PUBLIC SECURITY</text>
  <text x="400" y="118" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="14" font-weight="600" fill="#6b1119" text-anchor="middle">UNMANNED AERIAL SYSTEMS (UAV) COMMAND &amp; FORENSICS</text>
  
  <line x1="60" y1="135" x2="740" y2="135" stroke="#6b1119" stroke-width="2"/>
  <line x1="60" y1="138" x2="740" y2="138" stroke="#6b1119" stroke-width="0.5"/>
  
  <!-- Reference Details -->
  <text x="60" y="170" font-family="monospace" font-size="12" font-weight="bold" fill="#222">REF NO: MOI/UAV-CDR/1859/2026</text>
  <text x="560" y="170" font-family="monospace" font-size="12" font-weight="bold" fill="#222">DATE: 14/05/2026</text>
  <text x="60" y="195" font-family="monospace" font-size="12" font-weight="bold" fill="#6b1119">CASE FILE: LR NO. 1859 / UAV-CDR-2026-01</text>
  <text x="560" y="195" font-family="monospace" font-size="12" fill="#555">CLASSIFICATION: SENSITIVE</text>
  
  <!-- Subject -->
  <rect x="60" y="215" width="680" height="35" fill="#f8f1f2" stroke="#6b1119" stroke-width="1"/>
  <text x="400" y="238" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="13" font-weight="bold" fill="#6b1119" text-anchor="middle">SUBJECT: OFFICIAL CUSTODY TRANSFER &amp; FORENSIC EXTRACTION NOTICE</text>
  
  <!-- Letter Body -->
  <text x="60" y="280" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="13" font-weight="bold" fill="#222">TO: HEAD OF UAV FORENSICS LABORATORY &amp; EVIDENCE SECTION</text>
  <text x="60" y="300" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="13" fill="#333">FROM: CAPITAL PATROL &amp; INTERCEPT COMMAND (ZONE 4 - LUSAIL)</text>
  
  <text x="60" y="340" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">Pursuant to Decree Law No. 15 of 2002 regarding the Regulation of Civil Aviation, and</text>
  <text x="60" y="360" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">Executive Order No. 1859 concerning unauthorized Remotely Piloted Aircraft Systems (RPAS),</text>
  <text x="60" y="380" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">the following equipment was officially confiscated and impounded on 13/05/2026:</text>
  
  <!-- Impounded Gear Box -->
  <rect x="60" y="410" width="680" height="95" fill="#fafafa" stroke="#ccc" stroke-width="1"/>
  <text x="80" y="435" font-family="monospace" font-size="12" font-weight="bold" fill="#6b1119">1. AIRCRAFT MODEL : DJI Mini 4 Pro (SN: XXXXXXXXXXXXXXX)</text>
  <text x="80" y="455" font-family="monospace" font-size="12" font-weight="bold" fill="#6b1119">2. CONTROLLER UNIT : DJI RC-N2 (SN: XXXXXXXXXXXXXXX)</text>
  <text x="80" y="475" font-family="monospace" font-size="12" fill="#444">3. STORAGE MEDIA  : SanDisk Extreme 128GB MicroSD (Evidence Bag #EVD-9921)</text>
  <text x="80" y="495" font-family="monospace" font-size="12" fill="#444">4. INCIDENT LOC.   : Lusail Marina Promenade / Al Maha Restricted Airspace Perimeter</text>
  
  <text x="60" y="535" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">The aircraft was observed operating within a designated no-fly security buffer without</text>
  <text x="60" y="555" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">an active MOI permit or flight plan clearance. RF telemetry extraction was performed</text>
  <text x="60" y="575" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">confirming multiple sequential flight sorties breaching the 120m AGL ceiling.</text>
  
  <text x="60" y="610" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">This document serves as the formal letter of transfer to your custody for permanent</text>
  <text x="60" y="630" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#333">forensic archival, flight path reconstruction, and evidence submission to the prosecution.</text>
  
  <!-- Official Stamp & Signatures Box -->
  <rect x="60" y="680" width="680" height="180" fill="#fdfdfd" stroke="#6b1119" stroke-width="1" stroke-dasharray="4,2"/>
  
  <text x="120" y="715" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" font-weight="bold" fill="#333">DISPATCHING COMMANDER:</text>
  <text x="120" y="740" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" fill="#555">Major Khalid Al-Sulaiti</text>
  <text x="120" y="760" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="11" fill="#777">Commanding Officer, Zone 4</text>
  <text x="120" y="810" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="11" font-style="italic" fill="#888">[Signed &amp; Approved digitally]</text>
  
  <!-- Stamp circle -->
  <circle cx="400" cy="770" r="50" fill="none" stroke="#6b1119" stroke-width="2" stroke-dasharray="6,3"/>
  <circle cx="400" cy="770" r="42" fill="none" stroke="#6b1119" stroke-width="1"/>
  <text x="400" y="760" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="10" font-weight="bold" fill="#6b1119" text-anchor="middle">MINISTRY OF INTERIOR</text>
  <text x="400" y="775" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9" font-weight="bold" fill="#6b1119" text-anchor="middle">★ STATE OF QATAR ★</text>
  <text x="400" y="790" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="9" font-weight="bold" fill="#6b1119" text-anchor="middle">EVIDENCE DEPT</text>
  
  <text x="500" y="715" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" font-weight="bold" fill="#333">RECEIVING OFFICER:</text>
  <text x="500" y="740" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12" font-weight="bold" fill="#6b1119">Capt. Tariq Al-Kuwari</text>
  <text x="500" y="760" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="11" fill="#555">UAV Forensics Lead Investigator</text>
  <text x="500" y="810" font-family="monospace" font-size="11" fill="#6b1119">DATE: 14/05/2026 | 08:30 AM</text>
  
  <!-- Footer Note -->
  <line x1="60" y1="920" x2="740" y2="920" stroke="#ccc" stroke-width="1"/>
  <text x="400" y="950" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="10" fill="#888" text-anchor="middle">ATTACHED AS OFFICIAL PAGE 2 OF CONFISCATED DRONE REPORT (CDR)</text>
  <text x="400" y="970" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="10" fill="#888" text-anchor="middle">LAW ENFORCEMENT SENSITIVE · NOT FOR PUBLIC DISCLOSURE</text>
</svg>
`)}`;

// High-fidelity Flight Route Track & System Log Capture Evidence SVG Data URL (Aeroscope / DJI Flight Replay)
export const SAMPLE_FLIGHT_LOG_EVIDENCE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 480" width="1000" height="480">
  <defs>
    <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329"/>
      <stop offset="50%" stop-color="#111c38"/>
      <stop offset="100%" stop-color="#070c1a"/>
    </linearGradient>
    <radialGradient id="geofenceGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25"/>
      <stop offset="80%" stop-color="#dc2626" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#b91c1c" stop-opacity="0.0"/>
    </radialGradient>
  </defs>

  <!-- Background Map Grid -->
  <rect width="1000" height="480" fill="url(#mapBg)"/>
  
  <!-- Grid lines -->
  <g stroke="#1e293b" stroke-width="1" stroke-dasharray="4,4">
    <line x1="0" y1="80" x2="1000" y2="80"/>
    <line x1="0" y1="160" x2="1000" y2="160"/>
    <line x1="0" y1="240" x2="1000" y2="240"/>
    <line x1="0" y1="320" x2="1000" y2="320"/>
    <line x1="0" y1="400" x2="1000" y2="400"/>
    <line x1="120" y1="0" x2="120" y2="480"/>
    <line x1="280" y1="0" x2="280" y2="480"/>
    <line x1="440" y1="0" x2="440" y2="480"/>
    <line x1="600" y1="0" x2="600" y2="480"/>
    <line x1="760" y1="0" x2="760" y2="480"/>
    <line x1="920" y1="0" x2="920" y2="480"/>
  </g>

  <!-- Coastal contour simulation -->
  <path d="M 0,160 Q 200,140 380,210 T 640,320 T 1000,280 L 1000,480 L 0,480 Z" fill="#0f172a" opacity="0.6"/>
  <path d="M 0,160 Q 200,140 380,210 T 640,320 T 1000,280" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.4"/>

  <!-- Restricted Geofence Polygon (Red Zone) -->
  <polygon points="400,90 680,110 730,280 430,290" fill="url(#geofenceGlow)" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="560" y="145" font-family="monospace" font-size="11" font-weight="bold" fill="#f87171" text-anchor="middle">RESTRICTED AIRSPACE NFZ-04 (LUSAIL)</text>
  <text x="560" y="162" font-family="monospace" font-size="9" fill="#fca5a5" text-anchor="middle">PROHIBITED ZONE CEILING: 0-500M AGL</text>

  <!-- Flight Path Route (Red/Amber Track line) -->
  <path d="M 160,340 C 240,310 280,260 380,220 S 490,140 560,180 S 660,220 620,260 S 510,240 450,260 S 340,320 280,350" 
        fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
  <path d="M 160,340 C 240,310 280,260 380,220 S 490,140 560,180 S 660,220 620,260 S 510,240 450,260 S 340,320 280,350" 
        fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,4"/>

  <!-- Waypoints -->
  <!-- Takeoff -->
  <circle cx="160" cy="340" r="7" fill="#10b981"/>
  <circle cx="160" cy="340" r="14" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0.7"/>
  <rect x="100" y="365" width="120" height="22" rx="3" fill="#022c22" stroke="#10b981" stroke-width="1"/>
  <text x="160" y="380" font-family="monospace" font-size="10" font-weight="bold" fill="#34d399" text-anchor="middle">TAKEOFF (00:00)</text>

  <!-- Breach point -->
  <circle cx="480" cy="155" r="7" fill="#ef4444"/>
  <circle cx="480" cy="155" r="16" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>
  <rect x="420" y="70" width="125" height="24" rx="3" fill="#450a0a" stroke="#ef4444" stroke-width="1"/>
  <text x="482" y="86" font-family="monospace" font-size="10" font-weight="bold" fill="#fca5a5" text-anchor="middle">BREACH: 128m AGL</text>

  <!-- Intercept point -->
  <circle cx="280" cy="350" r="8" fill="#e11d48"/>
  <polygon points="280,340 287,358 273,358" fill="#ffffff"/>
  <rect x="220" y="385" width="135" height="24" rx="3" fill="#6b1119" stroke="#fda4af" stroke-width="1"/>
  <text x="287" y="401" font-family="monospace" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">INTERCEPT / CONFISCATED</text>

  <!-- Top System Telemetry HUD Bar (DJI Fly / Aeroscope Log Header) -->
  <rect x="0" y="0" width="1000" height="38" fill="#090d16" stroke="#1e293b" stroke-width="1"/>
  <text x="20" y="24" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="13" font-weight="bold" fill="#6b1119">UAV FORENSIC EXTRACTION</text>
  <text x="200" y="24" font-family="monospace" font-size="11" fill="#94a3b8">MODEL: DJI MINI 4 PRO | SN: 1581F5NBC2490192</text>
  <text x="640" y="24" font-family="monospace" font-size="11" fill="#38bdf8">GPS: 25.4215° N, 51.5283° E</text>
  <text x="890" y="24" font-family="monospace" font-size="11" font-weight="bold" fill="#ef4444">RF INTERCEPT: 5.8 GHz</text>

  <!-- Bottom Telemetry Stats Bar -->
  <rect x="15" y="420" width="970" height="46" rx="4" fill="#0f172a" stroke="#334155" stroke-width="1"/>
  <text x="35" y="448" font-family="monospace" font-size="12" font-weight="bold" fill="#f8fafc">ALT: <tspan fill="#38bdf8">128 m</tspan></text>
  <text x="175" y="448" font-family="monospace" font-size="12" font-weight="bold" fill="#f8fafc">SPD: <tspan fill="#38bdf8">14.2 m/s</tspan></text>
  <text x="320" y="448" font-family="monospace" font-size="12" font-weight="bold" fill="#f8fafc">DIST: <tspan fill="#38bdf8">1,840 m</tspan></text>
  <text x="475" y="448" font-family="monospace" font-size="12" font-weight="bold" fill="#f8fafc">SATS: <tspan fill="#10b981">24 (FIX)</tspan></text>
  <text x="630" y="448" font-family="monospace" font-size="12" font-weight="bold" fill="#f8fafc">LOG DURATION: <tspan fill="#fbbf24">18m 22s</tspan></text>
  <text x="820" y="448" font-family="monospace" font-size="11" font-weight="bold" fill="#f87171">STATUS: FORCED RTL</text>
</svg>
`)}`;

export const INITIAL_CONFISCATED_DRONES: ConfiscatedDroneReport[] = [
  {
    id: 'cdr-2026-001',
    srNumber: 'UAV-CDR-2026-01',
    lrNumber: '1859',
    date: '13/05/2026',
    droneModel: 'Dji mini4',
    droneSN: 'XXXXXXXXXXXXXXX',
    remoteSN: 'XXXXXXXXXXXXXXX',
    hasMultipleEntries: true,
    flightRecords: [
      {
        id: 'cfr-001-1',
        flightIndex: 1,
        date: '13/05/2026',
        location: 'Lusail Marina Promenade',
        coordinates: '25.4215° N, 51.5283° E',
        flightCount: 1,
        flightDuration: '18 mins',
        notes: 'Takeoff from public boardwalk into restricted zone',
        photos: [SAMPLE_FLIGHT_LOG_EVIDENCE_SVG],
      },
      {
        id: 'cfr-001-2',
        flightIndex: 2,
        date: '13/05/2026',
        location: 'Al Maha Island Restricted Perimeter',
        coordinates: '25.4310° N, 51.5412° E',
        flightCount: 2,
        flightDuration: '24 mins',
        notes: 'Hovering at 120m AGL above amusement perimeter',
        photos: [SAMPLE_FLIGHT_LOG_EVIDENCE_SVG],
      },
      {
        id: 'cfr-001-3',
        flightIndex: 3,
        date: '13/05/2026',
        location: 'Lusail Fox Hills North Approach',
        coordinates: '25.4102° N, 51.5120° E',
        flightCount: 3,
        flightDuration: '14 mins',
        notes: 'Return route before signal intercept and confiscation',
        photos: [SAMPLE_FLIGHT_LOG_EVIDENCE_SVG],
      },
    ],
    evidencePhotos: [SAMPLE_FLIGHT_LOG_EVIDENCE_SVG],
    evidenceNotes: 'GPS flight playback and telemetry logs recovered from controller internal storage.',
    correspondencePhotos: [SAMPLE_CORRESPONDENCE_LETTER_SVG],
    correspondenceLetterRef: 'MOI/UAV-CDR/1859/2026',
    correspondenceLetterDate: '14/05/2026',
    correspondenceNotes: 'Official impound notice and legal disposition transfer letter from Capital Patrol Command to Unmanned Aircraft Forensics Laboratory.',
    imageStretchMode: 'stretch',
    receivedBy: 'Capt. Tariq Al-Kuwari',
    evalDateTime: '14/05/2026 | 08:30 AM',
    fieldSystemNotes:
      'Non-permitted civilian flight intercepted in restricted maritime zone. Telemetry extracted from internal NAND flash storage via DJI Assistant forensic bridge. 3 sequential flight log sorties reconstructed showing geofence breach at 120m AGL. SD card preserved in evidence bag #EVD-9921.',
    status: 'CONFISCATED',
    department: 'UAV Team / SSOC',
    createdAt: '2026-05-13T10:30:00Z',
    updatedAt: '2026-05-14T08:30:00Z',
    createdBy: 'Capt. Tariq Al-Kuwari',
  },
  {
    id: 'cdr-2026-002',
    srNumber: 'UAV-CDR-2026-02',
    lrNumber: '1924',
    date: '18/05/2026',
    droneModel: 'DJI Mavic 3 Pro',
    droneSN: '1581F5NBC2490192',
    remoteSN: '4QQZJBA0088219',
    hasMultipleEntries: false,
    flightRecords: [
      {
        id: 'cfr-002-1',
        flightIndex: 1,
        date: '18/05/2026',
        location: 'The Pearl - Porto Arabia Tower 22',
        coordinates: '25.3712° N, 51.5540° E',
        flightCount: 1,
        flightDuration: '32 mins',
        notes: 'Unauthorized high-altitude photography in residential compound',
        photos: [],
      },
    ],
    evidencePhotos: [],
    evidenceNotes: 'Live DJI Aeroscope RF intercept log showing transmission timestamp matches custody time.',
    correspondencePhotos: [],
    correspondenceLetterRef: 'MOI/LE-1924/2026',
    correspondenceLetterDate: '19/05/2026',
    imageStretchMode: 'stretch',
    receivedBy: '1st Lt. Nasser Al-Attiyah',
    evalDateTime: '19/05/2026 | 09:15 AM',
    fieldSystemNotes:
      'Unauthorized aerial photography over diplomatic residential perimeter. Drone forced to land via RF protocol override. Pilot cited under Civil Aviation Law 15/2002. Custody transferred to UAV Evidence Repository.',
    status: 'ACTIVE',
    department: 'UAV Team / SSOC',
    createdAt: '2026-05-18T14:20:00Z',
    updatedAt: '2026-05-19T09:15:00Z',
    createdBy: '1st Lt. Nasser Al-Attiyah',
  },
];
