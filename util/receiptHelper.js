import { randomBytes } from "node:crypto";
import { prisma } from "../database/db.js";

/**
 * Converts a positive number to Indian Rupee Words (Lakh, Crore format)
 * e.g., 5000 -> "Five Thousand Rupees Only"
 *       12500 -> "Twelve Thousand Five Hundred Rupees Only"
 */
export const numberToWordsINR = (num) => {
  if (typeof num !== "number" || isNaN(num) || num <= 0) {
    return "Zero Rupees Only";
  }

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatSmall = (n) => {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)];
      if (n % 10 > 0) {
        str += " " + a[n % 10].trim();
      }
    } else if (n > 0) {
      str += a[n].trim();
    }
    return str.trim();
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "Zero Rupees Only";

  let words = "";

  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundred = Math.floor(rem / 100);
  rem = rem % 100;

  if (crore > 0) {
    words += (crore > 99 ? numberToWordsINR(crore).replace(" Rupees Only", "") : formatSmall(crore)) + " Crore ";
  }
  if (lakh > 0) {
    words += formatSmall(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += formatSmall(thousand) + " Thousand ";
  }
  if (hundred > 0) {
    words += formatSmall(hundred) + " Hundred ";
  }
  if (rem > 0) {
    words += formatSmall(rem) + " ";
  }

  words = words.trim() + " Rupees";

  if (decimalPart > 0) {
    words += " and " + formatSmall(decimalPart) + " Paise";
  }

  return words.trim() + " Only";
};

/**
 * Generates a unique receipt number in format: YUWA-YEAR-0001-UUID
 * e.g., YUWA-2026-0001-a1b2c3d4
 * @param {object} [client] Prisma client or transaction
 * @returns {Promise<string>} Unique receipt number
 */
export const generateReceiptNumber = async (client = prisma) => {
  const currentYear = new Date().getFullYear();
  const shortUuid = randomBytes(4).toString("hex");

  try {
    const result = await client.$queryRawUnsafe(`SELECT nextval('donation_receipt_seq')::text AS nextval;`);
    const nextCount = String(result[0]?.nextval || 1).padStart(4, "0");
    return `YUWA-${currentYear}-${nextCount}-${shortUuid}`;
  } catch (seqError) {
    try {
      // Auto-initialize sequence if it doesn't exist yet
      await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS donation_receipt_seq START 1;`);
      const result = await client.$queryRawUnsafe(`SELECT nextval('donation_receipt_seq')::text AS nextval;`);
      const nextCount = String(result[0]?.nextval || 1).padStart(4, "0");
      return `YUWA-${currentYear}-${nextCount}-${shortUuid}`;
    } catch (fallbackError) {
      // Fallback for mocked/unsupported test environments
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      const countInYear = await client.donation.count({
        where: {
          receiptNumber: { not: null },
          createdAt: {
            gte: startOfYear,
            lte: endOfYear
          }
        }
      });
      const nextCount = String(countInYear + 1).padStart(4, "0");
      return `YUWA-${currentYear}-${nextCount}-${shortUuid}`;
    }
  }
};
