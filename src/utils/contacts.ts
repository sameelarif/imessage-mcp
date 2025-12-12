/**
 * macOS Contacts Database Reader
 * Queries the local AddressBook database to resolve names to phone numbers
 */

import Database from "better-sqlite3";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { logger } from "./logger";

export interface Contact {
  id: number;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  fullName: string;
  phoneNumbers: string[];
  emails: string[];
}

/**
 * Find the contacts database path
 * macOS stores contacts in either:
 * - ~/Library/Application Support/AddressBook/AddressBook-v22.abcddb (local)
 * - ~/Library/Application Support/AddressBook/Sources/[UUID]/AddressBook-v22.abcddb (iCloud)
 */
function findContactsDatabase(): string | null {
  const addressBookPath = join(
    homedir(),
    "Library",
    "Application Support",
    "AddressBook"
  );

  // Check Sources folder first (iCloud synced contacts)
  const sourcesPath = join(addressBookPath, "Sources");
  if (existsSync(sourcesPath)) {
    const sources = readdirSync(sourcesPath);
    for (const source of sources) {
      const dbPath = join(sourcesPath, source, "AddressBook-v22.abcddb");
      if (existsSync(dbPath)) {
        return dbPath;
      }
    }
  }

  // Fall back to local database
  const localDbPath = join(addressBookPath, "AddressBook-v22.abcddb");
  if (existsSync(localDbPath)) {
    return localDbPath;
  }

  return null;
}

let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = findContactsDatabase();
  if (!dbPath) {
    throw new Error(
      "Contacts database not found. Make sure you have contacts on this Mac."
    );
  }

  logger.info("Opening contacts database: %s", dbPath);
  db = new Database(dbPath, { readonly: true });
  return db;
}

/**
 * Get all contacts with their phone numbers and emails
 */
export function getAllContacts(): Contact[] {
  const database = getDatabase();

  const rows = database
    .prepare(
      `
    SELECT 
      r.Z_PK as id,
      r.ZFIRSTNAME as firstName,
      r.ZLASTNAME as lastName,
      r.ZNICKNAME as nickname
    FROM ZABCDRECORD r
    WHERE r.ZFIRSTNAME IS NOT NULL OR r.ZLASTNAME IS NOT NULL
    ORDER BY r.ZFIRSTNAME, r.ZLASTNAME
  `
    )
    .all() as Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
  }>;

  return rows.map((row) => {
    // Get phone numbers for this contact
    const phones = database
      .prepare(
        `SELECT ZFULLNUMBER as phone FROM ZABCDPHONENUMBER WHERE ZOWNER = ?`
      )
      .all(row.id) as Array<{ phone: string }>;

    // Get emails for this contact
    const emails = database
      .prepare(
        `SELECT ZADDRESS as email FROM ZABCDEMAILADDRESS WHERE ZOWNER = ?`
      )
      .all(row.id) as Array<{ email: string }>;

    const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ");

    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      nickname: row.nickname,
      fullName: fullName || "Unknown",
      phoneNumbers: phones.map((p) => p.phone).filter(Boolean),
      emails: emails.map((e) => e.email).filter(Boolean),
    };
  });
}

/**
 * Search contacts by name (case-insensitive, partial match)
 */
export function searchContacts(query: string): Contact[] {
  const allContacts = getAllContacts();
  const queryLower = query.toLowerCase();

  return allContacts.filter((contact) => {
    const searchableFields = [
      contact.firstName,
      contact.lastName,
      contact.nickname,
      contact.fullName,
    ];

    return searchableFields.some(
      (field) => field && field.toLowerCase().includes(queryLower)
    );
  });
}

/**
 * Find a contact by phone number
 */
export function findContactByPhone(phone: string): Contact | null {
  const allContacts = getAllContacts();

  // Normalize the phone number (remove non-digits except +)
  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  return (
    allContacts.find((contact) =>
      contact.phoneNumbers.some((p) => {
        const normalized = p.replace(/[^\d+]/g, "");
        return (
          normalized === normalizedPhone ||
          normalized.endsWith(normalizedPhone.slice(-10)) ||
          normalizedPhone.endsWith(normalized.slice(-10))
        );
      })
    ) || null
  );
}

/**
 * Close the database connection
 */
export function closeContactsDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
