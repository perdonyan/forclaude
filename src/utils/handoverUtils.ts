import { 
  HandoverFormRecord, 
  HandoverEquipmentItem, 
  HandoverAccessoryItem, 
  DroneItem, 
  BatteryItem, 
  AccessoryItem, 
  StreamingDeviceItem,
  CheckoutRecord
} from '../types/drone';

const cleanStr = (s?: string) => (s || '').trim().toLowerCase();

/**
 * Returns true if the handover form is currently in active ISSUED or PENDING (partial return) status.
 */
export const isFormIssued = (form: HandoverFormRecord): boolean => {
  return form.status === 'ISSUED' || form.status === 'PENDING';
};

/**
 * Returns all active issued handover forms.
 */
export const getActiveIssuedHandoverForms = (forms: HandoverFormRecord[] = []): HandoverFormRecord[] => {
  return forms.filter(isFormIssued);
};

export interface MatchedHandoverInfo {
  form: HandoverFormRecord;
  itemType: 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE' | 'EQUIPMENT';
  matchedItem?: HandoverEquipmentItem | HandoverAccessoryItem;
  description?: string;
  serialNumber?: string;
}

/**
 * Checks if a drone is currently issued under any active Handover Document.
 */
export const getIssuedHandoverForDrone = (
  drone: DroneItem,
  forms: HandoverFormRecord[] = []
): MatchedHandoverInfo | null => {
  const issuedForms = getActiveIssuedHandoverForms(forms);
  const droneSN = cleanStr(drone.droneSN);
  const remoteSN = cleanStr(drone.remoteSN);
  const droneName = cleanStr(drone.droneName);

  for (const form of issuedForms) {
    if (!form.equipment) continue;

    for (const eq of form.equipment) {
      const eqSN = cleanStr(eq.serialNumber);
      const eqDesc = cleanStr(eq.description);

      if (!eqSN && !eqDesc) continue;

      const snMatch = (eqSN && (eqSN === droneSN || (remoteSN && eqSN === remoteSN)));
      const descMatch = (
        (droneSN && eqDesc.includes(droneSN)) ||
        (droneName && (
          eqDesc.includes(`(${droneName})`) ||
          eqDesc.includes(` ${droneName} `) ||
          eqDesc.endsWith(` ${droneName}`) ||
          eqDesc.startsWith(`${droneName} `) ||
          eqDesc === droneName
        ))
      );

      if (snMatch || descMatch) {
        if (eq.returned === true || eq.returnStatus === 'RETURNED') {
          continue;
        }
        return {
          form,
          itemType: 'DRONE',
          matchedItem: eq,
          description: eq.description || `${drone.model} (${drone.droneName})`,
          serialNumber: eq.serialNumber || drone.droneSN,
        };
      }
    }
  }

  return null;
};

/**
 * Checks if a battery is currently issued under any active Handover Document.
 */
export const getIssuedHandoverForBattery = (
  battery: BatteryItem,
  forms: HandoverFormRecord[] = []
): MatchedHandoverInfo | null => {
  const issuedForms = getActiveIssuedHandoverForms(forms);
  const batSN = cleanStr(battery.serialNumber);
  const batModel = cleanStr(battery.batteryModel);

  for (const form of issuedForms) {
    // Check in equipment rows
    if (form.equipment) {
      for (const eq of form.equipment) {
        const eqSN = cleanStr(eq.serialNumber);
        const eqDesc = cleanStr(eq.description);

        if (eqSN && eqSN === batSN) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'BATTERY',
            matchedItem: eq,
            description: eq.description || battery.batteryModel,
            serialNumber: eq.serialNumber || battery.serialNumber,
          };
        }

        if (batSN && eqDesc.includes(batSN)) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'BATTERY',
            matchedItem: eq,
            description: eq.description || battery.batteryModel,
            serialNumber: battery.serialNumber,
          };
        }
      }
    }

    // Check in accessory rows
    if (form.accessories) {
      for (const acc of form.accessories) {
        const accDesc = cleanStr(acc.description);
        if (batSN && accDesc.includes(batSN)) {
          if (acc.returned === true || acc.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'BATTERY',
            matchedItem: acc,
            description: acc.description,
            serialNumber: battery.serialNumber,
          };
        }
      }
    }
  }

  return null;
};

/**
 * Checks if an accessory is currently issued under any active Handover Document.
 */
export const getIssuedHandoverForAccessory = (
  accessory: AccessoryItem,
  forms: HandoverFormRecord[] = []
): MatchedHandoverInfo | null => {
  const issuedForms = getActiveIssuedHandoverForms(forms);
  const accSN = cleanStr(accessory.serialNumber);
  const accName = cleanStr(accessory.name);

  for (const form of issuedForms) {
    if (form.equipment) {
      for (const eq of form.equipment) {
        const eqSN = cleanStr(eq.serialNumber);
        const eqDesc = cleanStr(eq.description);

        if (accSN && eqSN && eqSN === accSN) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'ACCESSORY',
            matchedItem: eq,
            description: eq.description || accessory.name,
            serialNumber: eq.serialNumber || accessory.serialNumber,
          };
        }

        if (accSN && eqDesc.includes(accSN)) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'ACCESSORY',
            matchedItem: eq,
            description: eq.description || accessory.name,
            serialNumber: accessory.serialNumber,
          };
        }

        if (accName && eqDesc.includes(accName)) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'ACCESSORY',
            matchedItem: eq,
            description: eq.description || accessory.name,
            serialNumber: accessory.serialNumber,
          };
        }
      }
    }

    if (form.accessories) {
      for (const acc of form.accessories) {
        const accDesc = cleanStr(acc.description);
        if (accSN && accDesc.includes(accSN)) {
          if (acc.returned === true || acc.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'ACCESSORY',
            matchedItem: acc,
            description: acc.description || accessory.name,
            serialNumber: accessory.serialNumber,
          };
        }
        if (accName && accDesc.includes(accName)) {
          if (acc.returned === true || acc.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'ACCESSORY',
            matchedItem: acc,
            description: acc.description || accessory.name,
            serialNumber: accessory.serialNumber,
          };
        }
      }
    }
  }

  return null;
};

/**
 * Checks if a streaming device is currently issued under any active Handover Document.
 */
export const getIssuedHandoverForStreamingDevice = (
  device: StreamingDeviceItem,
  forms: HandoverFormRecord[] = []
): MatchedHandoverInfo | null => {
  const issuedForms = getActiveIssuedHandoverForms(forms);
  const devSN = cleanStr(device.serialNumber);
  const devName = cleanStr(device.deviceName);

  for (const form of issuedForms) {
    if (form.equipment) {
      for (const eq of form.equipment) {
        const eqSN = cleanStr(eq.serialNumber);
        const eqDesc = cleanStr(eq.description);

        if (devSN && eqSN && eqSN === devSN) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'STREAMING_DEVICE',
            matchedItem: eq,
            description: eq.description || device.deviceName,
            serialNumber: eq.serialNumber || device.serialNumber,
          };
        }

        if (devSN && eqDesc.includes(devSN)) {
          if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;
          return {
            form,
            itemType: 'STREAMING_DEVICE',
            matchedItem: eq,
            description: eq.description || device.deviceName,
            serialNumber: device.serialNumber,
          };
        }

        if (devName && eqDesc.includes(devName)) {
          return {
            form,
            itemType: 'STREAMING_DEVICE',
            matchedItem: eq,
            description: eq.description || device.deviceName,
            serialNumber: device.serialNumber,
          };
        }
      }
    }

    if (form.accessories) {
      for (const acc of form.accessories) {
        const accDesc = cleanStr(acc.description);
        if (devSN && accDesc.includes(devSN)) {
          return {
            form,
            itemType: 'STREAMING_DEVICE',
            matchedItem: acc,
            description: acc.description || device.deviceName,
            serialNumber: device.serialNumber,
          };
        }
        if (devName && accDesc.includes(devName)) {
          return {
            form,
            itemType: 'STREAMING_DEVICE',
            matchedItem: acc,
            description: acc.description || device.deviceName,
            serialNumber: device.serialNumber,
          };
        }
      }
    }
  }

  return null;
};

export interface IssuedAssetItem {
  id: string;
  type: 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE' | 'EQUIPMENT';
  title: string;
  serialNumber?: string;
  qty?: string | number;
  formId: string;
  formSrNumber: string;
  recipientName: string;
  recipientEmpId: string;
  recipientPhone?: string;
  dateIssued: string;
  timeIssued: string;
  purpose: string;
}

/**
 * Summarizes all individual equipment items across active issued handover forms.
 */
export const getAllIssuedAssetsSummary = (
  forms: HandoverFormRecord[] = [],
  drones: DroneItem[] = [],
  batteries: BatteryItem[] = [],
  accessories: AccessoryItem[] = [],
  streamingDevices: StreamingDeviceItem[] = []
): IssuedAssetItem[] => {
  const issuedForms = getActiveIssuedHandoverForms(forms);
  const results: IssuedAssetItem[] = [];

  for (const form of issuedForms) {
    // Process equipment
    if (form.equipment) {
      for (const eq of form.equipment) {
        if (!eq.description && !eq.serialNumber) continue;
        if (eq.returned === true || eq.returnStatus === 'RETURNED') continue;

        let type: IssuedAssetItem['type'] = 'EQUIPMENT';
        const eqSN = cleanStr(eq.serialNumber);
        const eqDesc = cleanStr(eq.description);

        if (
          drones.some(
            (d) =>
              (eqSN && (cleanStr(d.droneSN) === eqSN || cleanStr(d.remoteSN) === eqSN)) ||
              (d.droneName && eqDesc.includes(cleanStr(d.droneName)))
          ) ||
          eqDesc.includes('drone') ||
          eqDesc.includes('matrice') ||
          eqDesc.includes('mavic') ||
          eqDesc.includes('air 2s') ||
          eqDesc.includes('inspire')
        ) {
          type = 'DRONE';
        } else if (
          batteries.some(
            (b) =>
              (eqSN && cleanStr(b.serialNumber) === eqSN) ||
              eqDesc.includes(cleanStr(b.serialNumber)) ||
              eqDesc.includes(cleanStr(b.batteryModel))
          ) ||
          eqDesc.includes('battery') ||
          eqDesc.includes('tb60') ||
          eqDesc.includes('tb65') ||
          eqDesc.includes('tb30')
        ) {
          type = 'BATTERY';
        } else if (
          streamingDevices.some(
            (s) =>
              (eqSN && cleanStr(s.serialNumber) === eqSN) ||
              eqDesc.includes(cleanStr(s.serialNumber)) ||
              eqDesc.includes(cleanStr(s.deviceName))
          ) ||
          eqDesc.includes('encoder') ||
          eqDesc.includes('dongle') ||
          eqDesc.includes('liveu')
        ) {
          type = 'STREAMING_DEVICE';
        } else if (
          accessories.some(
            (a) =>
              (eqSN && cleanStr(a.serialNumber) === eqSN) ||
              eqDesc.includes(cleanStr(a.serialNumber)) ||
              eqDesc.includes(cleanStr(a.name))
          ) ||
          eqDesc.includes('camera') ||
          eqDesc.includes('zenmuse') ||
          eqDesc.includes('controller') ||
          eqDesc.includes('station') ||
          eqDesc.includes('rtk') ||
          eqDesc.includes('propeller')
        ) {
          type = 'ACCESSORY';
        }

        results.push({
          id: `${form.id}-eq-${eq.id || eq.no}`,
          type,
          title: eq.description || `Serial: ${eq.serialNumber}`,
          serialNumber: eq.serialNumber,
          formId: form.id,
          formSrNumber: form.srNumber,
          recipientName: form.recipientName,
          recipientEmpId: form.recipientEmpId,
          recipientPhone: form.recipientPhone,
          dateIssued: form.dateIssued,
          timeIssued: form.timeIssued,
          purpose: form.purpose,
        });
      }
    }

    // Process accessories
    if (form.accessories) {
      for (const acc of form.accessories) {
        if (!acc.description && !acc.qty) continue;
        if (acc.returned === true || acc.returnStatus === 'RETURNED') continue;

        const accDesc = cleanStr(acc.description);
        let type: IssuedAssetItem['type'] = 'ACCESSORY';

        if (
          accDesc.includes('battery') ||
          accDesc.includes('tb60') ||
          accDesc.includes('tb65') ||
          accDesc.includes('tb30') ||
          batteries.some(
            (b) =>
              (b.serialNumber && accDesc.includes(cleanStr(b.serialNumber))) ||
              accDesc.includes(cleanStr(b.batteryModel))
          )
        ) {
          type = 'BATTERY';
        } else if (
          accDesc.includes('dongle') ||
          accDesc.includes('encoder') ||
          accDesc.includes('stream') ||
          accDesc.includes('liveu') ||
          streamingDevices.some(
            (s) =>
              (s.serialNumber && accDesc.includes(cleanStr(s.serialNumber))) ||
              accDesc.includes(cleanStr(s.deviceName))
          )
        ) {
          type = 'STREAMING_DEVICE';
        }

        results.push({
          id: `${form.id}-acc-${acc.id || acc.no}`,
          type,
          title: acc.description ? `${acc.description}${acc.qty ? ` (Qty: ${acc.qty})` : ''}` : `Accessory #${acc.no}`,
          qty: acc.qty,
          formId: form.id,
          formSrNumber: form.srNumber,
          recipientName: form.recipientName,
          recipientEmpId: form.recipientEmpId,
          recipientPhone: form.recipientPhone,
          dateIssued: form.dateIssued,
          timeIssued: form.timeIssued,
          purpose: form.purpose,
        });
      }
    }
  }

  return results;
};

export type EquipmentUnavailabilityType = 
  | 'ISSUED' 
  | 'UNDER_REPAIR' 
  | 'CRASHED' 
  | 'MISSING' 
  | 'NO_RC' 
  | 'MAINTENANCE' 
  | 'DAMAGED' 
  | 'DEPLETED' 
  | 'CHARGING' 
  | 'OFFLINE'
  | 'OTHER';

export interface EquipmentAvailability {
  isAvailable: boolean;
  reason?: string;
  unavailabilityType?: EquipmentUnavailabilityType;
  badgeLabel?: string;
  issuedTo?: {
    recipientName: string;
    formSrNumber: string;
    formId?: string;
  };
}

/**
 * Checks if a drone is currently available to be added to a Handover Form.
 * If already issued, under repair, crashed, missing, or missing RC, returns unavailable.
 */
export const getDroneAvailability = (
  drone: DroneItem,
  handoverForms: HandoverFormRecord[] = [],
  checkouts: CheckoutRecord[] = [],
  excludeFormId?: string
): EquipmentAvailability => {
  const normStatus = cleanStr(drone.status);

  // 1. Check direct status flags
  if (normStatus === 'crashed') {
    return {
      isAvailable: false,
      unavailabilityType: 'CRASHED',
      badgeLabel: 'CRASHED',
      reason: 'Crashed (Airframe structural damage)',
    };
  }

  if (normStatus === 'under repair' || normStatus === 'repair') {
    return {
      isAvailable: false,
      unavailabilityType: 'UNDER_REPAIR',
      badgeLabel: 'UNDER REPAIR',
      reason: 'Under Repair (Depot maintenance)',
    };
  }

  if (normStatus === 'missing') {
    return {
      isAvailable: false,
      unavailabilityType: 'MISSING',
      badgeLabel: 'MISSING',
      reason: 'Missing (Unit unaccounted for)',
    };
  }

  if (!drone.remoteSN || cleanStr(drone.remoteSN).includes('missing')) {
    return {
      isAvailable: false,
      unavailabilityType: 'NO_RC',
      badgeLabel: 'NO RC',
      reason: 'No Remote Controller (Flight restricted)',
    };
  }

  if (normStatus === 'issued' || normStatus === 'deployed' || normStatus === 'in_use' || normStatus === 'in use') {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'ISSUED',
      reason: 'Already Issued (In operational custody)',
    };
  }

  // 2. Check if already issued in any active Handover Document
  const issuedForms = handoverForms.filter(
    (f) => (f.status === 'ISSUED' || f.status === 'PENDING' || f.status === 'PENDING_APPROVAL') && f.id !== excludeFormId
  );
  const issuedMatch = getIssuedHandoverForDrone(drone, issuedForms);
  if (issuedMatch) {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'ISSUED',
      reason: `Already Issued (${issuedMatch.form.srNumber} to ${issuedMatch.form.recipientName})`,
      issuedTo: {
        recipientName: issuedMatch.form.recipientName,
        formSrNumber: issuedMatch.form.srNumber,
        formId: issuedMatch.form.id,
      },
    };
  }

  // 3. Check active checkouts
  const activeCheckout = checkouts.find(
    (c) =>
      (c.status === 'CHECKED_OUT' || c.status === 'OVERDUE') &&
      (c.droneId === drone.id ||
        cleanStr(c.droneSN) === cleanStr(drone.droneSN) ||
        cleanStr(c.droneName) === cleanStr(drone.droneName))
  );
  if (activeCheckout) {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'ON SORTIE',
      reason: `Already Issued (Checked out by ${activeCheckout.operatorName})`,
      issuedTo: {
        recipientName: activeCheckout.operatorName,
        formSrNumber: 'Active Sortie',
        formId: activeCheckout.id,
      },
    };
  }

  if (normStatus !== 'active') {
    return {
      isAvailable: false,
      unavailabilityType: 'OTHER',
      badgeLabel: drone.status,
      reason: `Status: ${drone.status}`,
    };
  }

  return { isAvailable: true };
};

/**
 * Checks if a battery is currently available to be added to a Handover Form.
 * If already issued, under repair/maintenance, depleted, charging, returns unavailable.
 */
export const getBatteryAvailability = (
  battery: BatteryItem,
  handoverForms: HandoverFormRecord[] = [],
  excludeFormId?: string
): EquipmentAvailability => {
  const normStatus = cleanStr(battery.status);

  if (normStatus === 'maintenance' || normStatus === 'under repair' || normStatus === 'repair') {
    return {
      isAvailable: false,
      unavailabilityType: 'UNDER_REPAIR',
      badgeLabel: 'UNDER REPAIR',
      reason: 'Under Repair (Depot maintenance)',
    };
  }

  if (normStatus === 'crashed' || normStatus === 'damaged') {
    return {
      isAvailable: false,
      unavailabilityType: 'CRASHED',
      badgeLabel: 'CRASHED / DAMAGED',
      reason: 'Damaged (Cell degradation / structural damage)',
    };
  }

  if (normStatus === 'missing') {
    return {
      isAvailable: false,
      unavailabilityType: 'MISSING',
      badgeLabel: 'MISSING',
      reason: 'Missing (Battery pack unaccounted for)',
    };
  }

  if (normStatus === 'depleted') {
    return {
      isAvailable: false,
      unavailabilityType: 'DEPLETED',
      badgeLabel: 'DEPLETED',
      reason: 'Depleted (Requires recharge)',
    };
  }

  if (normStatus === 'charging') {
    return {
      isAvailable: false,
      unavailabilityType: 'CHARGING',
      badgeLabel: 'CHARGING',
      reason: 'Charging on dock bay',
    };
  }

  // Check active handover forms
  const issuedForms = handoverForms.filter(
    (f) => (f.status === 'ISSUED' || f.status === 'PENDING' || f.status === 'PENDING_APPROVAL') && f.id !== excludeFormId
  );
  const issuedMatch = getIssuedHandoverForBattery(battery, issuedForms);
  if (issuedMatch) {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'ISSUED',
      reason: `Already Issued (${issuedMatch.form.srNumber} to ${issuedMatch.form.recipientName})`,
      issuedTo: {
        recipientName: issuedMatch.form.recipientName,
        formSrNumber: issuedMatch.form.srNumber,
        formId: issuedMatch.form.id,
      },
    };
  }

  if (normStatus === 'in_use' || normStatus === 'in use' || normStatus === 'issued' || normStatus === 'deployed') {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'IN USE',
      reason: 'In Use (Deployed on operational flight pack)',
    };
  }

  if (normStatus !== 'ready') {
    return {
      isAvailable: false,
      unavailabilityType: 'OTHER',
      badgeLabel: battery.status,
      reason: `Battery status: ${battery.status}`,
    };
  }

  return { isAvailable: true };
};

/**
 * Checks if an accessory is currently available to be added to a Handover Form.
 * If already issued, deployed, under repair/maintenance, damaged, or needs inspection, returns unavailable.
 */
export const getAccessoryAvailability = (
  accessory: AccessoryItem,
  handoverForms: HandoverFormRecord[] = [],
  excludeFormId?: string
): EquipmentAvailability => {
  const normStatus = cleanStr(accessory.status);
  const normCondition = cleanStr(accessory.condition);

  if (normStatus === 'maintenance' || normStatus === 'under repair' || normStatus === 'repair') {
    return {
      isAvailable: false,
      unavailabilityType: 'UNDER_REPAIR',
      badgeLabel: 'UNDER REPAIR',
      reason: 'Under Repair (Maintenance inspection)',
    };
  }

  if (normStatus === 'crashed' || normStatus === 'missing') {
    return {
      isAvailable: false,
      unavailabilityType: normStatus === 'crashed' ? 'CRASHED' : 'MISSING',
      badgeLabel: normStatus.toUpperCase(),
      reason: `${normStatus.toUpperCase()} (Unit unaccounted for / structural damage)`,
    };
  }

  if (normCondition === 'damaged') {
    return {
      isAvailable: false,
      unavailabilityType: 'DAMAGED',
      badgeLabel: 'DAMAGED / CRASHED',
      reason: 'Damaged (Non-operational)',
    };
  }

  if (normCondition === 'needs_inspection') {
    return {
      isAvailable: false,
      unavailabilityType: 'UNDER_REPAIR',
      badgeLabel: 'NEEDS INSPECTION',
      reason: 'Needs technical safety inspection',
    };
  }

  // Check active handover forms
  const issuedForms = handoverForms.filter(
    (f) => (f.status === 'ISSUED' || f.status === 'PENDING' || f.status === 'PENDING_APPROVAL') && f.id !== excludeFormId
  );
  const issuedMatch = getIssuedHandoverForAccessory(accessory, issuedForms);
  if (issuedMatch) {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'ISSUED',
      reason: `Already Issued (${issuedMatch.form.srNumber} to ${issuedMatch.form.recipientName})`,
      issuedTo: {
        recipientName: issuedMatch.form.recipientName,
        formSrNumber: issuedMatch.form.srNumber,
        formId: issuedMatch.form.id,
      },
    };
  }

  if (normStatus === 'deployed' || normStatus === 'issued' || normStatus === 'in_use' || normStatus === 'in use') {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'DEPLOYED',
      reason: 'Already Deployed in field',
    };
  }

  if (normStatus !== 'available') {
    return {
      isAvailable: false,
      unavailabilityType: 'OTHER',
      badgeLabel: accessory.status,
      reason: `Status: ${accessory.status}`,
    };
  }

  return { isAvailable: true };
};

/**
 * Checks if a streaming device is currently available to be added to a Handover Form.
 * If already issued, streaming, under repair, or offline, returns unavailable.
 */
export const getStreamingDeviceAvailability = (
  device: StreamingDeviceItem,
  handoverForms: HandoverFormRecord[] = [],
  excludeFormId?: string
): EquipmentAvailability => {
  const normStatus = cleanStr(device.status);

  if (normStatus === 'maintenance' || normStatus === 'under repair' || normStatus === 'repair') {
    return {
      isAvailable: false,
      unavailabilityType: 'UNDER_REPAIR',
      badgeLabel: 'UNDER REPAIR',
      reason: 'Under Repair (Hardware service)',
    };
  }

  if (normStatus === 'crashed' || normStatus === 'missing') {
    return {
      isAvailable: false,
      unavailabilityType: normStatus === 'crashed' ? 'CRASHED' : 'MISSING',
      badgeLabel: normStatus.toUpperCase(),
      reason: `${normStatus.toUpperCase()} (Unit unaccounted for)`,
    };
  }

  if (normStatus === 'offline') {
    return {
      isAvailable: false,
      unavailabilityType: 'OFFLINE',
      badgeLabel: 'OFFLINE',
      reason: 'Offline (Uplink link disconnected)',
    };
  }

  // Check active handover forms
  const issuedForms = handoverForms.filter(
    (f) => (f.status === 'ISSUED' || f.status === 'PENDING' || f.status === 'PENDING_APPROVAL') && f.id !== excludeFormId
  );
  const issuedMatch = getIssuedHandoverForStreamingDevice(device, issuedForms);
  if (issuedMatch) {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'ISSUED',
      reason: `Already Issued (${issuedMatch.form.srNumber} to ${issuedMatch.form.recipientName})`,
      issuedTo: {
        recipientName: issuedMatch.form.recipientName,
        formSrNumber: issuedMatch.form.srNumber,
        formId: issuedMatch.form.id,
      },
    };
  }

  if (normStatus === 'online_streaming' || normStatus === 'deployed' || normStatus === 'issued' || normStatus === 'in_use') {
    return {
      isAvailable: false,
      unavailabilityType: 'ISSUED',
      badgeLabel: 'STREAMING / IN USE',
      reason: 'Already Streaming live feed',
    };
  }

  if (normStatus !== 'standby_ready') {
    return {
      isAvailable: false,
      unavailabilityType: 'OTHER',
      badgeLabel: device.status,
      reason: `Status: ${device.status}`,
    };
  }

  return { isAvailable: true };
};

/**
 * Helper to match any row input (description and/or serial) against inventory
 * and determine if the referenced equipment is currently unavailable.
 */
export interface RowEquipmentCheckResult {
  matchedItemName?: string;
  matchedSerial?: string;
  itemType?: 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE';
  availability: EquipmentAvailability;
}

export const checkRowEquipmentAvailability = (
  description: string,
  serialNumber: string,
  context: {
    drones?: DroneItem[];
    batteries?: BatteryItem[];
    accessories?: AccessoryItem[];
    streamingDevices?: StreamingDeviceItem[];
    handoverForms?: HandoverFormRecord[];
    checkouts?: CheckoutRecord[];
    excludeFormId?: string;
  }
): RowEquipmentCheckResult | null => {
  const dClean = cleanStr(description);
  const sClean = cleanStr(serialNumber);

  if (!dClean && !sClean) return null;

  const {
    drones = [],
    batteries = [],
    accessories = [],
    streamingDevices = [],
    handoverForms = [],
    checkouts = [],
    excludeFormId,
  } = context;

  // 1. Check Drones
  for (const drone of drones) {
    const droneSN = cleanStr(drone.droneSN);
    const remoteSN = cleanStr(drone.remoteSN);
    const droneName = cleanStr(drone.droneName);

    const snMatched = sClean && (sClean === droneSN || (remoteSN && sClean === remoteSN));
    const descMatched =
      (sClean && dClean.includes(droneSN)) ||
      (droneSN && dClean.includes(droneSN)) ||
      (droneName && (dClean === droneName || dClean.includes(`(${droneName})`) || dClean.includes(`${droneName} `)));

    if (snMatched || descMatched) {
      const avail = getDroneAvailability(drone, handoverForms, checkouts, excludeFormId);
      return {
        matchedItemName: `${drone.model} (${drone.droneName})`,
        matchedSerial: drone.droneSN,
        itemType: 'DRONE',
        availability: avail,
      };
    }
  }

  // 2. Check Batteries
  for (const bat of batteries) {
    const batSN = cleanStr(bat.serialNumber);
    const snMatched = sClean && (sClean === batSN || dClean.includes(batSN));
    const descMatched = batSN && dClean.includes(batSN);

    if (snMatched || descMatched) {
      const avail = getBatteryAvailability(bat, handoverForms, excludeFormId);
      return {
        matchedItemName: bat.batteryModel,
        matchedSerial: bat.serialNumber,
        itemType: 'BATTERY',
        availability: avail,
      };
    }
  }

  // 3. Check Accessories
  for (const acc of accessories) {
    const accSN = cleanStr(acc.serialNumber);
    const accName = cleanStr(acc.name);

    const snMatched = sClean && accSN && sClean === accSN;
    const descMatched = (accSN && dClean.includes(accSN)) || (accName && (dClean === accName || dClean.includes(accName)));

    if (snMatched || descMatched) {
      const avail = getAccessoryAvailability(acc, handoverForms, excludeFormId);
      return {
        matchedItemName: acc.name,
        matchedSerial: acc.serialNumber,
        itemType: 'ACCESSORY',
        availability: avail,
      };
    }
  }

  // 4. Check Streaming Devices
  for (const dev of streamingDevices) {
    const devSN = cleanStr(dev.serialNumber);
    const devName = cleanStr(dev.deviceName);

    const snMatched = sClean && devSN && sClean === devSN;
    const descMatched = (devSN && dClean.includes(devSN)) || (devName && (dClean === devName || dClean.includes(devName)));

    if (snMatched || descMatched) {
      const avail = getStreamingDeviceAvailability(dev, handoverForms, excludeFormId);
      return {
        matchedItemName: dev.deviceName,
        matchedSerial: dev.serialNumber,
        itemType: 'STREAMING_DEVICE',
        availability: avail,
      };
    }
  }

  return null;
};
