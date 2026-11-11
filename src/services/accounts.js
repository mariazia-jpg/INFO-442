// Account service.
//
// The MVP stores accounts in this browser's localStorage so the whole app runs
// without a backend or API keys. Passwords are never stored: only a salted
// SHA-256 hash. Accounts therefore exist only in the browser where they were
// created.
//
// To move to a hosted backend (Firebase Auth, Supabase, ...), replace the
// bodies of signUp, logIn, logOut and getCurrentUser and keep the same return
// values and error codes. Nothing else in the app reads account storage.

import { KEYS, readJsonSafe, remove, writeJson } from './storage.js';
import { sha256Hex } from '../lib/sha256.js';
import { validateLogIn, validateSignUp } from '../lib/validation.js';

export class AccountError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Subscribe to log in / log out. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === KEYS.session) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function loadAccounts() {
  return readJsonSafe(KEYS.accounts, {});
}

function publicUser(account) {
  return account ? { id: account.id, email: account.email, dateJoined: account.dateJoined } : null;
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function newSalt() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The logged-in user, or null. */
export function getCurrentUser() {
  const session = readJsonSafe(KEYS.session, null);
  if (!session?.userId) return null;
  const account = Object.values(loadAccounts()).find((a) => a.id === session.userId);
  return publicUser(account);
}

/**
 * Creates an account and logs it in (S6).
 * Error codes: email-required, password-required, invalid-email, weak-password, email-in-use.
 */
export async function signUp(email, password) {
  const problem = validateSignUp(email, password);
  if (problem) throw new AccountError(problem);

  const normalized = email.trim().toLowerCase();
  const accounts = loadAccounts();
  if (accounts[normalized]) throw new AccountError('email-in-use');

  const salt = newSalt();
  const account = {
    id: newId(),
    email: email.trim(),
    salt,
    passwordHash: await sha256Hex(`${salt}:${password}`),
    dateJoined: new Date().toISOString(),
  };
  writeJson(KEYS.accounts, { ...accounts, [normalized]: account });
  writeJson(KEYS.session, { userId: account.id });
  notify();
  return publicUser(account);
}

/**
 * Logs in an existing account (L6).
 * Error codes: email-required, password-required, incorrect-credentials.
 */
export async function logIn(email, password) {
  const problem = validateLogIn(email, password);
  if (problem) throw new AccountError(problem);

  const account = loadAccounts()[email.trim().toLowerCase()];
  const hash = account ? await sha256Hex(`${account.salt}:${password}`) : null;
  if (!account || hash !== account.passwordHash) throw new AccountError('incorrect-credentials');

  writeJson(KEYS.session, { userId: account.id });
  notify();
  return publicUser(account);
}

/** Logs out (N9) and forgets this browser session's photo. */
export async function logOut() {
  remove(KEYS.session);
  remove(KEYS.upload, 'session');
  notify();
}
