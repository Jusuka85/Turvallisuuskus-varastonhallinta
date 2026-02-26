# PelastusVarasto Backend

Tämä sovellus vaatii toimiakseen Google Apps Script -taustajärjestelmän (backend), joka on yhdistetty Google Sheetiin.

## Asennusohjeet

1.  Luo uusi **Google Sheet**.
2.  Luo kaksi välilehteä: `Varasto` ja `Lokit`.
3.  Lisää otsikot **Varasto**-välilehden ensimmäiselle riville tässä järjestyksessä:
    *   A1: `Tunniste` (ID)
    *   B1: `Nimi`
    *   C1: `Kategoria`
    *   D1: `Yksikkö` (Huom: Ennen määrää)
    *   E1: `Määrä` (Numero)
    *   F1: `QR-koodi`
4.  Lisää otsikot **Lokit**-välilehden ensimmäiselle riville:
    *   A1: `Loki ID`
    *   B1: `Aikaleima`
    *   C1: `Tuote ID`
    *   D1: `Tuotteen Nimi`
    *   E1: `Käyttäjä`
    *   F1: `Muutos`
    *   G1: `Toiminto`
5.  Avaa Sheetissä valikko **Laajennukset** > **Apps Script**.
6.  Poista kaikki oletuskoodi ja kopioi alla oleva koodi (tai `backend-script.gs` tiedoston sisältö) tilalle.
7.  Tallenna projekti.
8.  Julkaise sovellus:
    *   Klikkaa **Ota käyttöön** (Deploy) > **Uusi käyttöönotto** (New deployment).
    *   Valitse tyypiksi **Verkkosovellus** (Web app).
    *   Kuvaus: "Versio 3".
    *   Suorita käyttäjänä: **Minä** (Me).
    *   Kuka voi käyttää: **Kuka tahansa** (Anyone). **TÄRKEÄÄ: Valitse "Kuka tahansa" (Anyone), jotta sovellus toimii ilman kirjautumista.**
    *   Klikkaa **Ota käyttöön**.
9.  Kopioi saamasi **Verkkosovelluksen URL-osoite**.
10. Liitä URL-osoite React-sovelluksen tiedostoon `constants.ts` kohtaan `GOOGLE_SCRIPT_URL`. 

---

## Google Apps Script Koodi

Kopioi tämä koodi Google Apps Script -editoriin:

```javascript
/**
 * PELASTUSVARASTO BACKEND SCRIPT
 * 
 * Column Mapping (0-based index for array, 1-based for Sheet ranges):
 * 0 (A): ID
 * 1 (B): Name
 * 2 (C): Category
 * 3 (D): Unit (Yksikkö)
 * 4 (E): Quantity (Määrä)
 * 5 (F): QR Code
 */

// Define column indices for easy adjustment
var COL_ID = 0;
var COL_NAME = 1;
var COL_CATEGORY = 2;
var COL_UNIT = 3;      // Column D
var COL_QUANTITY = 4;  // Column E
var COL_QR = 5;        // Column F

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var params = e.parameter;
    
    if (e.postData && e.postData.contents) {
      try {
        var jsonBody = JSON.parse(e.postData.contents);
        for (var key in jsonBody) {
          params[key] = jsonBody[key];
        }
      } catch (err) {
        Logger.log("JSON Parse error: " + err);
      }
    }

    var action = params.action;
    var result = { success: false, message: "Invalid action" };

    if (action === "getInventory") {
      result = getInventory(ss);
    } else if (action === "logUsage") {
      result = logUsage(ss, params);
    } else if (action === "getLogs") {
      result = getLogs(ss);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getInventory(ss) {
  var sheet = ss.getSheetByName("Varasto");
  if (!sheet) return { success: false, message: "Sheet 'Varasto' not found" };
  
  var data = sheet.getDataRange().getValues();
  var items = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[COL_ID]) {
       items.push({
        id: String(row[COL_ID]),
        name: row[COL_NAME],
        category: row[COL_CATEGORY],
        quantity: Number(row[COL_QUANTITY]), // Read from Col E
        unit: row[COL_UNIT],                 // Read from Col D
        qrCode: String(row[COL_QR])
      });
    }
  }
  
  return { success: true, data: items };
}

function getLogs(ss) {
  var sheet = ss.getSheetByName("Lokit");
  if (!sheet) return { success: true, data: [] };
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: true, data: [] };
  
  var startRow = Math.max(2, lastRow - 49);
  var numRows = lastRow - startRow + 1;
  
  var data = sheet.getRange(startRow, 1, numRows, 7).getValues();
  var logs = [];
  
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    logs.push({
      id: String(row[0]),
      timestamp: row[1],
      itemId: String(row[2]),
      itemName: row[3],
      user: row[4],
      amountChanged: Number(row[5]),
      action: row[6]
    });
  }
  
  return { success: true, data: logs };
}

function logUsage(ss, params) {
  var itemId = params.itemId;
  var quantityChange = Number(params.quantity);
  var user = params.user;
  // Use explicit actionType if provided, otherwise fallback to inference
  var explicitActionType = params.actionType;
  
  if (!itemId || isNaN(quantityChange) || !user) {
    return { success: false, message: "Missing required parameters" };
  }

  var invSheet = ss.getSheetByName("Varasto");
  var logSheet = ss.getSheetByName("Lokit");
  
  var data = invSheet.getDataRange().getValues();
  var rowIndex = -1;
  var currentName = "Unknown";
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][COL_ID]) === String(itemId)) {
      rowIndex = i + 1;
      currentName = data[i][COL_NAME];
      // Read current quantity from Correct Column
      var currentQty = Number(data[i][COL_QUANTITY]);
      
      // Calculate new quantity
      var newQty = currentQty + quantityChange;

      // Update quantity in Correct Column (1-based index)
      invSheet.getRange(rowIndex, COL_QUANTITY + 1).setValue(newQty);
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: "Item ID not found" };
  }
  
  // Determine action string to save
  var actionTypeToSave = explicitActionType;
  if (!actionTypeToSave) {
     actionTypeToSave = quantityChange < 0 ? "USE" : "RESTOCK";
  }
  
  var logId = new Date().getTime().toString();
  var timestamp = new Date().toISOString();
  
  logSheet.appendRow([
    logId, 
    timestamp, 
    itemId, 
    currentName, 
    user, 
    quantityChange, 
    actionTypeToSave
  ]);
  
  return { success: true };
}
```