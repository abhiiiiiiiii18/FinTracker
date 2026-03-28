export interface ParsedSMS {
  amount: number;
  type: 'Debit' | 'Credit';
  merchant: string;
  date: Date;
  externalId?: string;
}

/**
 * Parses an SMS body to extract financial information like amount, transaction type, and merchant.
 * 
 * @param body The SMS message text
 * @param sender The sender ID of the SMS (e.g., 'AD-HDFCBK')
 * @returns ParsedSMS object or null if no financial data is found
 */
export function parseFinanceSMS(body: string, sender: string): ParsedSMS | null {
  const bodyLower = body.toLowerCase();

  // 1. Transaction Type
  let type: 'Debit' | 'Credit' | null = null;
  const debitKeywords = /(debited|spent|deducted|paid|sent)/i;
  const creditKeywords = /(credited|received|added|refunded)/i;

  if (debitKeywords.test(bodyLower)) {
    type = 'Debit';
  } else if (creditKeywords.test(bodyLower)) {
    type = 'Credit';
  }

  // If we can't determine type, it's likely not a transaction SMS
  if (!type) {
    return null;
  }

  // 2. Amount
  // Matches "Rs. 100", "INR 100", "₹ 100", "debited 100", "spent 100", etc.
  let amount = 0;
  // This looks for currency symbols/keywords, optional spacing/words, and then grabs the numeric value
  const amountRegex = /(?:rs\.?|inr|₹|debited|spent|credited)(?:\s*(?:for|by|with))?\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)/i;
  const amountMatch = body.match(amountRegex);

  if (amountMatch && amountMatch[1]) {
    // Remove commas from numbers like 1,000.50
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  } else {
    // If we can't find an amount, parsing fails
    return null;
  }

  // 3. Merchant
  let merchant = 'Unknown';
  // Look for keywords 'at', 'to', or 'vpa' and capture the following words until a stopping word/punctuation
  const merchantRegex = /(?:(?:\bat\b)|(?:\bto\b)|(?:\bvpa[: ]?\b))\s+([a-zA-Z0-9\s@&]+?)(?:\s+(?:on|is|ref|from|balance|bal|available|avbl|avl|\d{2}-|\d{1,2}\/\d{1,2})|[.,]|$)/i;
  const merchantMatch = body.match(merchantRegex);

  if (merchantMatch && merchantMatch[1]) {
    merchant = merchantMatch[1].trim();
    // Clean up trailing spaces or punctuation just in case
    merchant = merchant.replace(/[.,;:\s]+$/, '');
  } else {
    // Fallback: Use the sender ID as the merchant name if no explicit merchant is matched inside the message
    // e.g., 'AD-HDFCBK' -> 'HDFCBK'
    const senderParts = sender.split('-');
    if (senderParts.length > 1) {
      merchant = senderParts[senderParts.length - 1];
    } else {
      merchant = sender;
    }
  }

  // 4. UPI Ref No (External ID)
  let externalId: string | undefined;
  const refRegex = /(?:UPI Ref No[. :]?|Ref No[:. \-]?|UTR[:. \-]?)([0-9]{12})/i;
  const refMatch = body.match(refRegex);
  if (refMatch && refMatch[1]) {
    externalId = refMatch[1];
  }

  return {
    amount,
    type,
    merchant,
    date: new Date(), // Return current date (or this could be passed as a param)
    externalId,
  };
}
