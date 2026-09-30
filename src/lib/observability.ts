/**
 * MahaPoshan Register - Operational Observability & Structured Logging
 *
 * Captures structured operational events for:
 * - AUTH_FAILURE
 * - SYNC_FAILURE
 * - EMAIL_FAILURE
 * - SUBSCRIPTION_FAILURE
 * - EXPORT_FAILURE
 * - APPROVAL_FAILURE
 * - AUDIT_ACTION
 *
 * Strictly redacts passwords, tokens, passcodes, API keys, and sensitive fields.
 */

export type LogCategory =
  | 'AUTH_FAILURE'
  | 'SYNC_FAILURE'
  | 'SYNC_RECOVERY'
  | 'EMAIL_FAILURE'
  | 'SUBSCRIPTION_FAILURE'
  | 'SUBSCRIPTION_LIFECYCLE'
  | 'EXPORT_FAILURE'
  | 'EXPORT_AUDIT'
  | 'APPROVAL_FAILURE'
  | 'SECURITY_VIOLATION';

export type LogSeverity = 'info' | 'warn' | 'error' | 'critical';

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  category: LogCategory;
  severity: LogSeverity;
  message: string;
  schoolId?: string;
  userId?: string;
  context?: Record<string, any>;
}

const LOG_STORAGE_KEY = 'pm_poshan_structured_logs_v1';
const MAX_LOG_ENTRIES = 200;

const SENSITIVE_KEY_PATTERN = /passcode|password|token|secret|apikey|api_key|authorization|jwt|credential|service_role/i;

/**
 * Recursively redacts any sensitive fields from log context objects.
 * Never logs passwords, tokens, passcodes, or service-role keys.
 */
export function redactSensitiveData(input: any): any {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    // Redact Bearer tokens or Resend/Supabase keys if accidentally passed in string
    return input
      .replace(/re_[a-zA-Z0-9_]{10,}/g, '[REDACTED_API_KEY]')
      .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]');
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else if (typeof value === 'string') {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logStructuredEvent(params: {
  category: LogCategory;
  severity?: LogSeverity;
  level?: LogSeverity;
  message: string;
  schoolId?: string;
  userId?: string;
  context?: Record<string, any>;
}): StructuredLogEntry {
  const effectiveSeverity: LogSeverity = params.severity || params.level || 'info';
  const entry: StructuredLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    category: params.category,
    severity: effectiveSeverity,
    message: redactSensitiveData(params.message),
    schoolId: params.schoolId,
    userId: params.userId,
    context: params.context ? redactSensitiveData(params.context) : undefined,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const existingRaw = localStorage.getItem(LOG_STORAGE_KEY);
      const logs: StructuredLogEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      logs.unshift(entry);
      if (logs.length > MAX_LOG_ENTRIES) {
        logs.length = MAX_LOG_ENTRIES;
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    }
  } catch {
    // Fail silently if storage is unavailable
  }

  return entry;
}

export function getStructuredLogs(filterCategory?: LogCategory): StructuredLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    const logs: StructuredLogEntry[] = JSON.parse(raw);
    if (filterCategory) {
      return logs.filter((l) => l.category === filterCategory);
    }
    return logs;
  } catch {
    return [];
  }
}

export function clearStructuredLogs(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOG_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}
