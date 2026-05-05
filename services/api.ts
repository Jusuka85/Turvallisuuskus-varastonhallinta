import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDoc,
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { InventoryItem, UsageLog } from '../types';
import { INITIAL_ITEMS } from '../constants';

const ITEMS_COLLECTION = 'items';
const LOGS_COLLECTION = 'logs';

export const api = {
  /**
   * Fetch all inventory items from Firestore
   */
  getInventory: async (): Promise<InventoryItem[]> => {
    try {
      const q = query(collection(db, ITEMS_COLLECTION), orderBy('name'));
      const snapshot = await getDocs(q);
      
      // If empty, seed with initial items (First time setup)
      if (snapshot.empty) {
        const batch = writeBatch(db);
        INITIAL_ITEMS.forEach(item => {
          const docRef = doc(collection(db, ITEMS_COLLECTION), item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
        return INITIAL_ITEMS;
      }

      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as InventoryItem[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, ITEMS_COLLECTION);
      return [];
    }
  },

  /**
   * Log usage and update stock atomically
   */
  logUsage: async (itemId: string, quantity: number, user: string, actionType: 'USE' | 'RESTOCK' | 'RETURN' | 'CORRECTION' | 'REPORT_BROKEN'): Promise<boolean> => {
    try {
      const itemRef = doc(db, ITEMS_COLLECTION, itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        console.error("Item not found:", itemId);
        return false;
      }

      const itemData = itemSnap.data() as InventoryItem;
      const batch = writeBatch(db);

      // Update quantity
      batch.update(itemRef, {
        quantity: increment(quantity)
      });

      // Create log
      const logRef = doc(collection(db, LOGS_COLLECTION));
      const logData: Omit<UsageLog, 'id'> & { timestamp: any } = {
        timestamp: new Date().toISOString(), // Keeping ISO string as per types.ts, but could use serverTimestamp()
        itemId,
        itemName: itemData.name,
        user,
        amountChanged: quantity,
        action: actionType
      };
      
      batch.set(logRef, logData);

      await batch.commit();
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `logUsage/${itemId}`);
      return false;
    }
  },

  /**
   * Get recent logs from Firestore
   */
  getLogs: async (): Promise<UsageLog[]> => {
    try {
      const q = query(
        collection(db, LOGS_COLLECTION), 
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as UsageLog[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, LOGS_COLLECTION);
      return [];
    }
  },

  /**
   * Add a new item to the inventory
   */
  addItem: async (item: Omit<InventoryItem, 'id' | 'borrowedQuantity'>): Promise<string | null> => {
    try {
      const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
        ...item,
        borrowedQuantity: 0
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ITEMS_COLLECTION);
      return null;
    }
  }
};
