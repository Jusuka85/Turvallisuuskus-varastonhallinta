/**
 * GOOGLE APPS SCRIPT BACKEND FOR PELASTUSVARASTO
 * 
 * Sijoita tämä koodi Google Sheetsin "Apps Script" -editoriin.
 * Varmista, että Sheets-taulukossasi on välilehdet nimeltä "Inventory" ja "Logs".
 * 
 * Taulukoiden sarakkeet:
 * Inventory: ID, Nimi, Kategoria, Määrä, Yksikkö, QR-koodi, Tyyppi
 * Logs: ID, Aikaleima, TuoteID, TuoteNimi, Käyttäjä, Muutos, Toiminto
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventory') {
    var sheet = ss.getSheetByName("Inventory");
    var data = sheet.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === "") continue;
      items.push({
        id: data[i][0].toString(),
        name: data[i][1],
        category: data[i][2],
        quantity: Number(data[i][3]),
        unit: data[i][4],
        qrCode: data[i][5].toString(),
        itemType: data[i][6] || 'consumable'
      });
    }
    return createJsonOutput({ success: true, data: items });
  }
  
  if (action === 'getLogs') {
    var sheet = ss.getSheetByName("Logs");
    var data = sheet.getDataRange().getValues();
    var logs = [];
    // Haetaan viimeisimmät tapahtumat (päällimmäisenä uusimmat)
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === "") continue;
      logs.push({
        id: data[i][0].toString(),
        timestamp: data[i][1],
        itemId: data[i][2].toString(),
        itemName: data[i][3],
        user: data[i][4],
        amountChanged: Number(data[i][5]),
        action: data[i][6]
      });
      if (logs.length >= 100) break; // Rajataan sataan viimeisimpään
    }
    return createJsonOutput({ success: true, data: logs });
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'logUsage') {
      var inventorySheet = ss.getSheetByName("Inventory");
      var logsSheet = ss.getSheetByName("Logs");
      
      var itemId = postData.itemId;
      var quantityChange = Number(postData.quantity);
      var user = postData.user;
      var actionType = postData.actionType;
      
      // 1. Päivitä varastosaldo
      var data = inventorySheet.getDataRange().getValues();
      var itemFound = false;
      var itemName = "Unknown";
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === itemId.toString()) {
          var currentQty = Number(data[i][3]);
          var newQty = currentQty + quantityChange;
          inventorySheet.getRange(i + 1, 4).setValue(newQty);
          itemName = data[i][1];
          itemFound = true;
          break;
        }
      }
      
      if (!itemFound) {
        return createJsonOutput({ success: false, message: "Tuotetta ei löytynyt" });
      }
      
      // 2. Lisää lokikirjaus
      var timestamp = new Date();
      var logId = "L-" + timestamp.getTime();
      logsSheet.appendRow([
        logId,
        timestamp,
        itemId,
        itemName,
        user,
        quantityChange,
        actionType
      ]);
      
      return createJsonOutput({ success: true });
    }
  } catch (error) {
    return createJsonOutput({ success: false, message: error.toString() });
  }
}

function createJsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
