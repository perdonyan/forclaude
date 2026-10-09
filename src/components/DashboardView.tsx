import React from 'react';
import { DroneItem, HandoverFormRecord, SidebarTab, InventorySubTab } from '../types/drone';
import { FleetAnalytics } from './FleetAnalytics';

export interface DashboardViewProps {
  drones: DroneItem[];
  handoverForms?: HandoverFormRecord[];
  onNavigateToHandover?: (formId: string) => void;
  onNavigateTab?: (
    tab: SidebarTab,
    options?: {
      subTab?: InventorySubTab;
      status?: string;
      department?: 'SSOC' | 'SSD' | 'all';
      filter?: string;
      inOutStatusFilter?: 'ALL' | 'ISSUED' | 'RETURNED' | 'PENDING' | 'PENDING_APPROVAL' | 'DRAFT' | 'ARCHIVED';
    }
  ) => void;
  onAddDrone?: () => void;
  onOpenBatchUpload?: () => void;
  checkouts?: any[];
  batteries?: any[];
  accessories?: any[];
  streamingDevices?: any[];
  onCheckInDrone?: (checkoutId: string) => void;
  onOpenBatchLabels?: () => void;
  onViewAssetTag?: (drone: DroneItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  drones,
  handoverForms = [],
  onNavigateToHandover,
  onNavigateTab,
  onAddDrone,
  onOpenBatchUpload,
}) => {
  return (
    <FleetAnalytics
      drones={drones}
      handoverForms={handoverForms}
      onNavigateToHandover={onNavigateToHandover}
      onSelectFleetFilter={(filter) => {
        onNavigateTab?.('INVENTORY', {
          subTab: 'all',
          status: filter.status,
          department: filter.department as any,
        });
      }}
      onAddDrone={onAddDrone}
      onOpenBatchUpload={onOpenBatchUpload}
    />
  );
};
