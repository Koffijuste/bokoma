// @/utils/helpers.ts
/**
 * Validation Helpers
 *
 * Standards :
 * - Email   : RFC 5322 simplified (TLD ≥ 2 chars, charset autorisé restreint)
 * - Password: NIST SP 800-63B inspired → min 8, 1 maj, 1 min, 1 chiffre, 1 spécial
 * - Phone   : E.164 international (+CC + numéro), avec validation par pays
 *             pour les principaux pays de la zone + internationaux
 */

// ── Email ───────────────────────────────────────────────────────────────────
// Accepte lettres, chiffres, +._- avant le @ ; lettres/chiffits/.- après ; TLD ≥ 2
const RE_EMAIL =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

export function validEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const v = email.trim();
  if (v.length < 5 || v.length > 254) return false; // RFC 5321
  return RE_EMAIL.test(v);
}

// ── Password ────────────────────────────────────────────────────────────────
// Min 8 caractères, au moins 1 minuscule, 1 majuscule, 1 chiffre, 1 caractère spécial.
// On exclut l'espace (souvent injecté par copier-coller et fragile dans les saisies).
const RE_PASSWORD =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]).{8,128}$/;

export function validPassword(password: string): boolean {
  if (typeof password !== 'string') return false;
  return RE_PASSWORD.test(password);
}

// ── Phone — validation par pays (E.164) ─────────────────────────────────────
// Chaque pays a un indicatif et un format attendu. On accepte le numéro
// soit en E.164 (avec +), soit en format local (commençant par 0) — on
// normalise puis on valide.

export interface PhoneRule {
  /** Indicatif téléphonique international (avec +) */
  dial: string;
  /** Nombre de chiffres attendus APRÈS l'indicatif (sans le 0 initial local) */
  digits: number;
  /** Longueurs alternatives acceptées (certains pays ont 8 OU 9 chiffres) */
  digitsAlt?: number[];
  /** Indique si le format local commence par un 0 (la plupart des pays africains/européens) */
  localLeadingZero: boolean;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  // Afrique de l'Ouest / Centrale (marché principal Bokoma)
  CI: { dial: '+225', digits: 10, localLeadingZero: true }, // Côte d'Ivoire
  SN: { dial: '+221', digits: 9,  localLeadingZero: true }, // Sénégal
  CM: { dial: '+237', digits: 9,  localLeadingZero: true }, // Cameroun
  CD: { dial: '+243', digits: 9,  localLeadingZero: true, digitsAlt: [10] }, // RDC
  CG: { dial: '+242', digits: 9,  localLeadingZero: true }, // Congo-Brazzaville
  GA: { dial: '+241', digits: 7,  digitsAlt: [8], localLeadingZero: true }, // Gabon
  ML: { dial: '+223', digits: 8,  localLeadingZero: true }, // Mali
  BF: { dial: '+226', digits: 8,  localLeadingZero: true }, // Burkina Faso
  NE: { dial: '+227', digits: 8,  localLeadingZero: true }, // Niger
  TD: { dial: '+235', digits: 8,  localLeadingZero: true }, // Tchad
  // International
  FR: { dial: '+33',  digits: 9,  localLeadingZero: true }, // France
  BE: { dial: '+32',  digits: 9,  localLeadingZero: true }, // Belgique
  CA: { dial: '+1',   digits: 10, localLeadingZero: true }, // Canada
  US: { dial: '+1',   digits: 10, localLeadingZero: true }, // États-Unis
  // Pas de validation stricte pour "OTHER"
  OTHER: { dial: '+', digits: 7, digitsAlt: [8, 9, 10, 11, 12, 13, 14, 15], localLeadingZero: false },
};

/**
 * Normalise un numéro de téléphone saisi par l'utilisateur.
 * Accepte : "+225 07 07 07 07 07", "07 07 07 07 07", "2250707070707", "0707070707"
 * Retourne l'E.164 (ex: "+2250707070707") ou null si non normalisable.
 */
export function normalizePhone(input: string, country?: string): string | null {
  if (typeof input !== 'string') return null;
  // Strip tout sauf + et chiffres
  let raw = input.replace(/[^\d+]/g, '');
  if (!raw) return null;

  // Détection d'un + initial
  const hasPlus = raw.startsWith('+');
  let digits = hasPlus ? raw.slice(1) : raw;

  // Si on a un code pays (3 chiffres après le +) et qu'il matche un pays connu
  // ou celui passé en param, on le retire pour traiter le reste comme local.
  const rule = country ? PHONE_RULES[country] : undefined;

  // Cas 1 : commence par un + explicite → on suppose E.164
  if (hasPlus) {
    if (digits.length < 7 || digits.length > 15) return null; // E.164 : 7-15 chiffres
    return `+${digits}`;
  }

  // Cas 2 : commence par l'indicatif pays (ex: 225...) SANS +
  if (rule && digits.startsWith(rule.dial.replace('+', ''))) {
    digits = digits.slice(rule.dial.length - 1); // retire "225"
  }

  // Cas 3 : format local avec 0 initial (ex: 0707070707)
  if (rule?.localLeadingZero && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!rule) {
    // Pas de règle pays : E.164 générique
    if (digits.length < 7 || digits.length > 15) return null;
    return `+${digits}`;
  }

  // Validation du nombre de chiffres selon le pays
  const expected = [rule.digits, ...(rule.digitsAlt ?? [])];
  if (!expected.includes(digits.length)) return null;

  return `${rule.dial}${digits}`;
}

/**
 * Valide un numéro de téléphone pour un pays donné.
 * Retourne true si le numéro est valide après normalisation.
 */
export function validPhone(phone: string, country?: string): boolean {
  return normalizePhone(phone, country) !== null;
}

/**
 * Valide un numéro au format E.164 strict (avec +).
 * Format : +[1-9][0-9]{6,14} (E.164 ITU-T E.123 : 7 à 15 chiffres max).
 */
const RE_PHONE_E164 = /^\+[1-9]\d{6,14}$/;
export function isE164(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  return RE_PHONE_E164.test(phone);
}

export function validURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * String Helpers
 */

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Number Helpers
 */

export function formatPrice(price: number, currency = 'XOF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(price);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Formate une taille en octets en chaîne lisible (B / KB / MB).
 * Utilisé par la galerie et tout upload UI.
 */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function percentage(value: number, total: number): number {
  return (value / total) * 100;
}

/**
 * Date Helpers — ✅ MISE À JOUR
 */

// ✅ Format court : 25 déc. 2024
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ✅ Format long avec heure : 25 décembre 2024 à 14:30
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ✅ Format pour PDF/reçu : 25/12/2024 14:30
export function formatDateTimeCompact(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ✅ Format relatif : "il y a 2 heures", "hier", "le 25 déc."
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  if (diffHours < 24) return `il y a ${diffHours} h`;
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  return formatDate(date);
}

export function getDaysFromNow(date: Date | string): number {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Array Helpers
 */

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Object Helpers
 */

export function omit<T extends object>(
  obj: T,
  ...keys: (keyof T)[]
): Partial<T> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pick<T extends object>(
  obj: T,
  ...keys: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

/**
 * Class Helpers
 */

export function cx(...classes: (string | undefined | false)[]): string {
  return classes.filter((c) => typeof c === 'string').join(' ');
}

export const cn = cx;

export const calculateDiscount = (
  originalPrice: number,
  discountedPrice: number
) => {
  if (originalPrice === 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};