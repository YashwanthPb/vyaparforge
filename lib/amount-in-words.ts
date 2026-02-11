const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigitWords(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0 && rest > 0) return ones[h] + " Hundred " + twoDigitWords(rest);
  if (h > 0) return ones[h] + " Hundred";
  return twoDigitWords(rest);
}

/**
 * Converts a number to Indian English words.
 * Uses Indian number system: Crore, Lakh, Thousand, Hundred.
 * e.g. 1,23,456.50 → "Rupees One Lakh Twenty Three Thousand Four Hundred and Fifty Six Paise Fifty Only"
 */
export function amountInWords(amount: number): string {
  if (amount === 0) return "Rupees Zero Only";

  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  let words = "";

  if (rupees > 0) {
    words = "Rupees " + integerToIndianWords(rupees);
  }

  if (paise > 0) {
    if (rupees > 0) words += " and ";
    words += (rupees === 0 ? "Rupees " : "") + twoDigitWords(paise) + " Paise";
  }

  if (isNegative) words = "Minus " + words;

  return words + " Only";
}

function integerToIndianWords(n: number): string {
  if (n === 0) return "Zero";

  // Indian system: Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2)
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remainder = n;

  const parts: string[] = [];

  if (crore > 0) parts.push(twoDigitWords(crore) + " Crore");
  if (lakh > 0) parts.push(twoDigitWords(lakh) + " Lakh");
  if (thousand > 0) parts.push(twoDigitWords(thousand) + " Thousand");

  if (remainder > 0) {
    const prefix = parts.length > 0 ? "and " : "";
    parts.push(prefix + threeDigitWords(remainder));
  }

  return parts.join(" ");
}
