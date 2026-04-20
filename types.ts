export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  qrCode: string;
  itemType?: 'consumable' | 'borrowable';
  borrowedQuantity?: number;
}

export interface UsageLog {
  id: string;
  timestamp: string;
  itemId: string;
  itemName: string;
  user: string;
  amountChanged: number;
  action: 'USE' | 'RESTOCK' | 'RETURN' | 'CORRECTION' | 'REPORT_BROKEN';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export type Organization = string;

// Enum for App View State
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SCANNER = 'SCANNER',
  ITEM_DETAILS = 'ITEM_DETAILS',
  LOGS = 'LOGS',
  PRINT_LABELS = 'PRINT_LABELS',
  SIMPLE_SCANNER = 'SIMPLE_SCANNER',
  BORROWS = 'BORROWS'
}