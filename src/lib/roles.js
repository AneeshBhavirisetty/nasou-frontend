/* Display names for account roles.
   The backend role value for internal staff stays `RETAILER` (it is what the
   API issues in JWTs), but in the product it is a "Team member" — admins and
   team members together are the internal users of the admin console. */
export const ROLE_LABEL = {
  ADMIN: 'Admin',
  RETAILER: 'Team member',
  CUSTOMER: 'Customer',
};

export const roleLabel = (role) => ROLE_LABEL[role] || role;

/* Roles that may open the admin console (what they can do there is decided
   per person by IAM permissions — see context/IamStore.jsx). */
export const INTERNAL_ROLES = ['ADMIN', 'RETAILER'];
export const isInternalRole = (role) => INTERNAL_ROLES.includes(role);
