import { createStore, useStore, uid } from './store';

/* ============================================================================
 * auditLog.js — append-only audit trail (Super Admin requirement 4).
 *
 * Every create, edit, delete, approval, login, export, permission change,
 * scope bypass and "view as retailer" session is written here with who did
 * it, the old and new value, when, and from where. There is no update or
 * delete function — only audit(). Each entry carries a hash of the previous
 * one, so the Audit log screen can show whether the chain is intact.
 *
 * The client has no trustworthy IP; entries made here say so. The API
 * (nasou-api AuditService + ClientIp) records the real address server-side.
 * ==========================================================================*/

const MAX = 3000;
const CLIENT_IP = 'browser (demo)';

/* FNV-1a, 32-bit — enough to make tampering visible in a demo trail. */
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
const body = (e) => JSON.stringify([e.id, e.at, e.actorId, e.action, e.entity, e.entityId, e.summary, e.before, e.after]);
const seal = (e, prev) => ({ ...e, prev, hash: fnv(prev + body(e)) });

function seed() {
  const now = Date.now();
  const m = 60000;
  const rows = [
    [now - 9 * 24 * 60 * m, 'Priya Sharma', 'owner', 'retailer.approve', 'retailer', 'r3', 'Approved Krishna Agro & Plumbing', { status: 'pending' }, { status: 'approved' }],
    [now - 6 * 24 * 60 * m, 'Priya Sharma', 'owner', 'permission.change', 'role', 'support', 'Support can now start refunds', { refunds: 'view' }, { refunds: 'start' }],
    [now - 4 * 24 * 60 * m, 'Priya Sharma', 'owner', 'retailer.request_changes', 'retailer', 'r5', 'Asked Coastal Paints & Tools for a clearer bank proof', { status: 'pending' }, { status: 'needs_changes' }],
    [now - 2 * 24 * 60 * m, 'Vikram Das', 'finance', 'payout.mark_paid', 'payout', 'r1', 'Payout to Sri Sai Pipes & Sanitary marked paid', { status: 'approved' }, { status: 'paid' }],
    [now - 26 * 60 * m, 'Imran Sheikh', 'operations', 'auth.login', 'session', 'ops', 'Signed in with two-factor code', null, null],
    [now - 20 * 60 * m, 'Imran Sheikh', 'operations', 'export.csv', 'orders', null, 'Exported 26 orders to CSV', null, null],
  ];
  let prev = '00000000';
  return rows.map(([at, actorName, actorRole, action, entity, entityId, summary, before, after], i) => {
    const e = seal({ id: `au_seed${i}`, at, actorId: actorRole, actorName, actorRole, action, entity, entityId, summary, before, after, ip: '10.0.4.21', via: 'console' }, prev);
    prev = e.hash;
    return e;
  });
}

const store = createStore('nivora_audit_v1', seed);

let current = null; // { id, name, role } — set by AuthProvider
export function setAuditActor(actor) { current = actor; }

/* audit({ action, entity, entityId, summary, before, after, actor? }) */
export function audit({ action, entity = '', entityId = null, summary = '', before = null, after = null, actor }) {
  const who = actor || current || { id: 'system', name: 'System', role: 'system' };
  store.set((list) => {
    const prev = list.length ? list[list.length - 1].hash : '00000000';
    const entry = seal({
      id: uid('au'),
      at: Date.now(),
      actorId: who.id,
      actorName: who.name,
      actorRole: who.role,
      action,
      entity,
      entityId,
      summary,
      before,
      after,
      ip: CLIENT_IP,
      via: who.via || 'web',
    }, prev);
    const next = [...list, entry];
    return next.length > MAX ? next.slice(next.length - MAX) : next;
  });
}

/* Super Admin reads bypass retailer scoping on purpose (requirement 1);
   each bypass is logged once per resource per signed-in session. */
const bypassed = new Set();
export function logBypass({ actor, resource, count }) {
  const k = `${actor?.id}:${resource}`;
  if (bypassed.has(k)) return;
  bypassed.add(k);
  audit({ action: 'scope.bypass', entity: resource, summary: `Platform view of all retailers' ${resource} (${count} rows)` });
}
export const resetBypassLog = () => bypassed.clear();

/* Is every entry's hash consistent with its content and predecessor? */
export function verifyChain(list) {
  for (let i = 1; i < list.length; i += 1) {
    const e = list[i];
    if (e.prev !== list[i - 1].hash) return { ok: false, at: i };
    if (fnv(e.prev + body(e)) !== e.hash) return { ok: false, at: i };
  }
  if (list[0] && fnv(list[0].prev + body(list[0])) !== list[0].hash) return { ok: false, at: 0 };
  return { ok: true };
}

export const readAudit = () => store.get();
export const useAuditLog = () => useStore(store);
