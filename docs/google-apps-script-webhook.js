/**
 * Google Apps Script Snippet for Payment Sync
 * 
 * Add this code to your GAS project.
 * Ensure you set the Script Properties:
 * - PAYMENT_SYNC_API_URL: e.g. https://your-domain.com/api/payments/sync
 * - PAYMENT_SYNC_API_KEY: The key from your .env file
 */

function pushToERP_() {
    const props = PropertiesService.getScriptProperties();
    const erpUrl = props.getProperty('PAYMENT_SYNC_API_URL');
    const apiKey = props.getProperty('PAYMENT_SYNC_API_KEY');

    if (!erpUrl || !apiKey) {
        Logger.log("Missing ERP URL or API Key");
        return;
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Payments"); // Adjust sheet name
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Find column indices
    const colMap = {};
    headers.forEach((h, i) => colMap[h.toString().trim()] = i);

    // Required columns check could go here

    // Find "Synced to ERP" column or create it
    let syncColIndex = headers.indexOf("Synced to ERP");
    if (syncColIndex === -1) {
        sheet.getRange(1, headers.length + 1).setValue("Synced to ERP");
        syncColIndex = headers.length;
    }

    const payload = [];
    const rowsToUpdate = [];

    rows.forEach((row, i) => {
        const isSynced = row[syncColIndex];
        if (isSynced === "YES") return; // Skip already synced

        // Construct record
        // Mapping based on "PAYMENT DATA STRUCTURE" provided
        const record = {
            invoiceNumber: row[colMap["Invoice Number"]],
            netAmount: Number(row[colMap["Net Amount"]]),
            utrNumber: row[colMap["UTR Number"]],
            utrTotal: Number(row[colMap["UTR Total"]]),
            date: formatDate_(row[colMap["Date"]]), // Ensure "YYYY-MM-DD HH:mm:ss"
            division: row[colMap["Division"]],
            poNumber: row[colMap["PO Number"]],
            grossAmount: Number(row[colMap["Gross Amount"]]),
            diffPercent: Number(row[colMap["Diff % (Gross - Net)"]]),
            confidence: row[colMap["Confidence"]],
            mailLink: row[colMap["Mail Link"]]
        };

        // Simple validation
        if (record.invoiceNumber && record.netAmount) {
            payload.push(record);
            rowsToUpdate.push(i + 2); // 1-based index, +1 for header
        }
    });

    if (payload.length === 0) {
        Logger.log("No new records to sync.");
        return;
    }

    try {
        const options = {
            'method': 'post',
            'contentType': 'application/json',
            'headers': {
                'x-api-key': apiKey
            },
            'payload': JSON.stringify(payload),
            'muteHttpExceptions': true
        };

        const response = UrlFetchApp.fetch(erpUrl, options);
        const code = response.getResponseCode();
        const responseBody = response.getContentText();

        if (code === 200) {
            Logger.log("Sync success: " + responseBody);
            // Mark rows as synced
            rowsToUpdate.forEach(rowIndex => {
                sheet.getRange(rowIndex, syncColIndex + 1).setValue("YES");
            });
        } else {
            Logger.log("Sync failed (" + code + "): " + responseBody);
        }
    } catch (e) {
        Logger.log("Error during sync: " + e.toString());
    }
}

function formatDate_(date) {
    if (!date) return "";
    if (date instanceof Date) {
        return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    }
    return date.toString();
}
