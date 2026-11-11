import fs from 'fs';
import path from 'path';
import { Contract, LedgerEntry } from './types';
import { MOCK_CONTRACT, MOCK_LEDGER } from './mock-data';
import { logger } from './logger';

interface EscrowDatabase {
  contracts: Record<string, Contract>;
  ledgerByContract: Record<string, LedgerEntry[]>;
  webhookEvents: Array<{
    id: string;
    eventType: string;
    receivedAt: string;
    actionTaken: string;
    payload: Record<string, unknown>;
  }>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'escrow-db.json');

function createInitialDb(): EscrowDatabase {
  return {
    contracts: {
      [MOCK_CONTRACT.id]: structuredClone(MOCK_CONTRACT),
    },
    ledgerByContract: {
      [MOCK_CONTRACT.id]: structuredClone(MOCK_LEDGER),
    },
    webhookEvents: [],
  };
}

function readDb(): EscrowDatabase {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const initial = createInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as EscrowDatabase;
  } catch {
    return createInitialDb();
  }
}

function writeDb(db: EscrowDatabase): void {
  const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    logger.error('store.write_failed', { error: err instanceof Error ? err.message : String(err) });
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // ignore cleanup error
    }
  }
}

export function findContract(id: string): Contract | null {
  const db = readDb();
  if (db.contracts[id]) {
    return db.contracts[id];
  }
  if (id === MOCK_CONTRACT.id) {
    return structuredClone(MOCK_CONTRACT);
  }
  return null;
}

export function getContract(id: string): Contract {
  return findContract(id) || structuredClone(MOCK_CONTRACT);
}

export function saveContract(contract: Contract): Contract {
  const db = readDb();
  db.contracts[contract.id] = contract;
  if (!db.ledgerByContract[contract.id]) {
    db.ledgerByContract[contract.id] = [];
  }
  writeDb(db);
  return contract;
}

export function deleteContract(id: string): boolean {
  if (!id || id === MOCK_CONTRACT.id) return false;
  const db = readDb();
  if (!db.contracts[id]) return false;
  delete db.contracts[id];
  delete db.ledgerByContract[id];
  writeDb(db);
  return true;
}

export function listContracts(): Contract[] {
  const db = readDb();
  return Object.values(db.contracts);
}

export function getLedger(contractId: string): LedgerEntry[] {
  const db = readDb();
  if (db.ledgerByContract[contractId]) {
    return db.ledgerByContract[contractId];
  }
  return contractId === MOCK_CONTRACT.id ? structuredClone(MOCK_LEDGER) : [];
}

export function appendLedgerEntries(contractId: string, entries: LedgerEntry[]): LedgerEntry[] {
  const db = readDb();
  const current =
    db.ledgerByContract[contractId] ||
    (contractId === MOCK_CONTRACT.id ? structuredClone(MOCK_LEDGER) : []);
  const updated = [...entries, ...current];
  db.ledgerByContract[contractId] = updated;
  writeDb(db);
  return updated;
}

export function resetContractStore(contractId: string): { contract: Contract; ledger: LedgerEntry[] } {
  const db = readDb();
  const freshContract = structuredClone(MOCK_CONTRACT);
  freshContract.id = contractId;
  const freshLedger = structuredClone(MOCK_LEDGER);
  db.contracts[contractId] = freshContract;
  db.ledgerByContract[contractId] = freshLedger;
  writeDb(db);
  return { contract: freshContract, ledger: freshLedger };
}

export function hasWebhookEvent(id: string): boolean {
  const db = readDb();
  return db.webhookEvents.some((e) => e.id === id);
}

export function recordWebhookEvent(
  id: string,
  eventType: string,
  actionTaken: string,
  payload: Record<string, unknown>
): void {
  const db = readDb();
  if (db.webhookEvents.some((e) => e.id === id)) {
    return;
  }
  db.webhookEvents.unshift({
    id,
    eventType,
    receivedAt: new Date().toISOString(),
    actionTaken,
    payload,
  });
  db.webhookEvents = db.webhookEvents.slice(0, 100);
  writeDb(db);
}

export function getWebhookEvents() {
  const db = readDb();
  return db.webhookEvents;
}

