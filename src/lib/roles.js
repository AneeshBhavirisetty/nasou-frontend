/* Account roles. There are exactly two: Admin (uses the admin console) and
   Customer (shops). What each admin may do in the console is set per person
   in Users & access (context/IamStore.jsx). */
export const ROLE_LABEL = {
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
};

export const roleLabel = (role) => ROLE_LABEL[role] || 'Customer';
