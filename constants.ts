import { InventoryItem, UsageLog } from './types';

// Google Apps Script Web App URL
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIlfXv7O4SPBjQtnlJ99k8TxjA0BqUqhpg6afkkyzhXOy-KBqzexi6Cs6v9mpRhktoMg/exec"; 

export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: '1',
    name: 'Lastulevy 12mm',
    category: 'Polttoharjoitus',
    quantity: 45,
    unit: 'kpl',
    qrCode: 'ITEM-001'
  },
  {
    id: '2',
    name: 'Kakkosnelonen (2x4")',
    category: 'Rakennus',
    quantity: 120,
    unit: 'm',
    qrCode: 'ITEM-002'
  },
  {
    id: '3',
    name: 'Sammutin 6kg (Jauhe)',
    category: 'Kalusto',
    quantity: 12,
    unit: 'kpl',
    qrCode: 'ITEM-003'
  },
  {
    id: '4',
    name: 'Sytytysneste',
    category: 'Polttoharjoitus',
    quantity: 5,
    unit: 'l',
    qrCode: 'ITEM-004'
  }
];

export const INITIAL_LOGS: UsageLog[] = [
  {
    id: 'l1',
    timestamp: new Date(Date.now() - 10000000).toISOString(),
    itemId: '1',
    itemName: 'Lastulevy 12mm',
    user: 'Matti Meikäläinen',
    amountChanged: -2,
    action: 'USE'
  },
  {
    id: 'l2',
    timestamp: new Date(Date.now() - 5000000).toISOString(),
    itemId: '3',
    itemName: 'Sammutin 6kg (Jauhe)',
    user: 'Pekka Pelastaja',
    amountChanged: -1,
    action: 'USE'
  }
];