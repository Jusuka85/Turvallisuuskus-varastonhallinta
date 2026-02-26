import { InventoryItem, UsageLog, ApiResponse } from '../types';
import { INITIAL_ITEMS, INITIAL_LOGS, GOOGLE_SCRIPT_URL } from '../constants';

// Local storage keys for mock persistence
const STORAGE_ITEMS_KEY = 'rescue_inventory_items';
const STORAGE_LOGS_KEY = 'rescue_inventory_logs';

const isDemo = !GOOGLE_SCRIPT_URL;

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  /**
   * Fetch all inventory items
   */
  getInventory: async (): Promise<InventoryItem[]> => {
    if (isDemo) {
      await delay(600);
      const stored = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    } else {
      try {
        // Add timestamp to prevent caching
        const params = new URLSearchParams({ 
          action: 'getInventory', 
          _t: Date.now().toString() 
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
          method: 'GET',
          redirect: 'follow'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ApiResponse<InventoryItem[]> = await response.json();
        
        if (!data.success) {
           console.error("API reported error:", data.message);
           return [];
        }
        
        return data.data || [];
      } catch (error) {
        console.error("API Error getInventory. Check if script is deployed as 'Anyone'.", error);
        throw error; // Re-throw so App can show error state
      }
    }
  },

  /**
   * Log usage and update stock
   * @param itemId 
   * @param quantity Negative for removing, Positive for adding
   * @param user 
   * @param actionType Optional explicit action type (USE, RESTOCK, RETURN, CORRECTION)
   */
  logUsage: async (itemId: string, quantity: number, user: string, actionType: 'USE' | 'RESTOCK' | 'RETURN' | 'CORRECTION'): Promise<boolean> => {
    
    if (isDemo) {
      await delay(800);
      
      // Update Items
      const storedItemsStr = localStorage.getItem(STORAGE_ITEMS_KEY);
      const items: InventoryItem[] = storedItemsStr ? JSON.parse(storedItemsStr) : INITIAL_ITEMS;
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: item.quantity + quantity }; 
        }
        return item;
      });
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(updatedItems));

      // Add Log
      const storedLogsStr = localStorage.getItem(STORAGE_LOGS_KEY);
      const logs: UsageLog[] = storedLogsStr ? JSON.parse(storedLogsStr) : INITIAL_LOGS;
      
      const targetItem = items.find(i => i.id === itemId);
      
      const newLog: UsageLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        itemId,
        itemName: targetItem?.name || 'Unknown',
        user,
        amountChanged: quantity,
        action: actionType
      };
      
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify([newLog, ...logs]));
      return true;
    } else {
      // Real API Call
      try {
        const payload = {
          action: 'logUsage',
          itemId,
          quantity, 
          user,
          actionType // Send explicit type
        };
        
        // Critical: use text/plain to avoid CORS preflight (OPTIONS) which GAS doesn't handle
        // backend-script.gs must use JSON.parse(e.postData.contents)
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          console.error("API returned failure:", data.message);
          return false;
        }
        return true;
      } catch (error) {
        console.error("API Error logUsage", error);
        return false;
      }
    }
  },

  /**
   * Get logs
   */
  getLogs: async (): Promise<UsageLog[]> => {
    if (isDemo) {
      await delay(500);
      const stored = localStorage.getItem(STORAGE_LOGS_KEY);
      if (stored) return JSON.parse(stored);
      return INITIAL_LOGS;
    } else {
       try {
        const params = new URLSearchParams({ 
          action: 'getLogs',
          _t: Date.now().toString() 
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
           method: 'GET',
           redirect: 'follow'
        });
        
        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse<UsageLog[]> = await response.json();
        return data.data || [];
      } catch (error) {
        console.error("API Error getLogs", error);
        return [];
      }
    }
  }
};