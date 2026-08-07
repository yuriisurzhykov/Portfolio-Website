/**
 * A deliberately small, structured (JSON-line) audit logger — not a
 * dependency like pino/winston, since the actual requirement (OWASP audit,
 * A09) is "every security-relevant event lands somewhere greppable/
 * alertable," not log rotation, transports, or levels this app has no use
 * for yet. Writes to stdout, which systemd already captures into the
 * journal for both the dev and prod units (see
 * `.scripts/provision/08-systemd-service.sh`) — `journalctl -u
 * <service> | grep '"event":"login_failed"'` works today with zero extra
 * infrastructure.
 *
 * NEVER pass a password, raw refresh/access token, or any other secret as
 * a field — every call site in this codebase is expected to pass only IDs,
 * emails, IPs, and event metadata. There's no field-name allowlist
 * enforcing this at the type level (that would need a much heavier type
 * per event); it's a convention every call site must uphold, the same way
 * `backend/src/errors.ts` relies on every error message being written by
 * hand to never leak internals rather than a generic redaction filter.
 */
export interface AuditLogFields {
    [key: string]: string | number | boolean | null | undefined;
}

export interface AuditLogEntry extends AuditLogFields {
    event: string;
    timestamp: string;
}

type AuditSink = (entry: AuditLogEntry) => void;

function defaultSink(entry: AuditLogEntry): void {
    console.log(JSON.stringify(entry));
}

let sink: AuditSink = defaultSink;

/** Records one structured audit event. See this file's own doc comment for what must never be passed in `fields`. */
export function logAuditEvent(event: string, fields: AuditLogFields = {}): void {
    sink({ event, timestamp: new Date().toISOString(), ...fields });
}

/**
 * Test-only escape hatch, same pattern `rate-limit.ts`'s
 * `setRateLimiterForTesting` already uses — lets a test assert on emitted
 * entries instead of spying on `console.log` globally, and restores the
 * real sink when called with `undefined`.
 */
export function setAuditSinkForTesting(nextSink: AuditSink | undefined): void {
    sink = nextSink ?? defaultSink;
}
