/**
 * ── GTM2026 Google Sheet CMS & Localization API Endpoint (Google Apps Script) ──
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1YEZ4ckOK8bXymqvtguxJ4MQhCW_e1o4tsuqb7oxy8Jg/edit
 * 2. Click Extensions > Apps Script
 * 3. Replace all content in Code.gs with this code.
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone" (allows website visitors to read public copy without sign-in)
 * 8. Copy the Web App URL and set it in your website via GTM_CMS.setEndpointUrl('YOUR_URL') or in js/cms-i18n.js
 */

var SHEET_GID = "936964007"; // Master CMS Tab

function doGet(e) {
  var lang = (e && e.parameter && e.parameter.lang) ? e.parameter.lang.toLowerCase() : "all";
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var targetSheet = null;

    // Locate sheet by GID or first sheet
    for (var i = 0; i < sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(SHEET_GID)) {
        targetSheet = sheets[i];
        break;
      }
    }
    if (!targetSheet) {
      targetSheet = sheets[0];
    }

    var data = targetSheet.getDataRange().getDisplayValues();
    if (!data || data.length < 2) {
      return createJsonResponse({ error: "No data found" });
    }

    var headers = data[0];
    var colKey = -1;
    var colEn = -1;
    var colHi = -1;

    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]).trim().toLowerCase();
      if (h === "key" || h === "id") colKey = c;
      if (h === "en" || h.indexOf("english") !== -1) colEn = c;
      if (h === "hi" || h.indexOf("hindi") !== -1) colHi = c;
    }

    // Default column fallbacks: A=Key, D=English, E=Hindi
    if (colKey === -1) colKey = 0;
    if (colEn === -1) colEn = 3;
    if (colHi === -1) colHi = 4;

    var dictEn = {};
    var dictHi = {};

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var key = String(row[colKey] || "").trim();
      if (!key) continue;

      var enVal = row[colEn] !== undefined ? String(row[colEn]).trim() : "";
      var hiVal = row[colHi] !== undefined ? String(row[colHi]).trim() : "";

      dictEn[key] = enVal;
      dictHi[key] = hiVal;
    }

    var responseData;
    if (lang === "en") {
      responseData = dictEn;
    } else if (lang === "hi") {
      responseData = dictHi;
    } else {
      responseData = {
        en: dictEn,
        hi: dictHi
      };
    }

    return createJsonResponse(responseData);
  } catch (err) {
    return createJsonResponse({ error: err.toString() }, 500);
  }
}

function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
