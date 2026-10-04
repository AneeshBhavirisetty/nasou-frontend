/* Account roles. Three kinds of user (Super Admin requirements, section 1):
   ADMIN     the Nasou Hive team, in the Super Admin console. What each one
             may do comes from their team role preset (lib/access.js).
   RETAILER  an onboarded retailer or one of their staff, in /seller.
   CUSTOMER  a buyer. */
import { teamRoleLabel, staffRole } from './access';

export const ROLE_LABEL = {
  ADMIN: 'Nasou Hive team',
  RETAILER: 'Retailer',
  CUSTOMER: 'Customer',
};

export const roleLabel = (role) => ROLE_LABEL[role] || 'Customer';

/* the most specific label for a signed-in user */
export function userRoleLabel(u) {
  if (!u) return '';
  if (u.role === 'ADMIN') return u.teamRole ? `${teamRoleLabel(u.teamRole)} · Nasou Hive` : 'Nasou Hive team';
  if (u.role === 'RETAILER') return `Retailer · ${staffRole(u.staffRole).label}`;
  return 'Customer';
}
