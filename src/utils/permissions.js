export const defaultTabPermissions = {
  facility_profile: ['admin', 'facility_admin', 'marketing_admin'],
  domain: ['admin', 'facility_admin', 'marketing_admin'],
  payment_settings: ['admin', 'facility_admin', 'marketing_admin'],
  ward_settings: ['admin', 'facility_admin', 'operations_manager'],
  staff_onboarding: ['admin', 'facility_admin', 'hr_manager'],
  role_requests: ['admin', 'facility_admin', 'hr_manager'],
  hr: ['admin', 'facility_admin', 'hr_manager'],
  roster: ['admin', 'facility_admin', 'hr_manager'],
  broadcasts: ['admin', 'facility_admin', 'operations_manager'],
  procurement: ['admin', 'facility_admin', 'operations_manager'],
  help_desk: ['admin', 'facility_admin', 'operations_manager'],
  audit: ['admin', 'facility_admin', 'it_support'],
  email_logs: ['admin', 'facility_admin', 'it_support'],
  smtp_settings: ['admin', 'facility_admin', 'it_support'],
  licensing: ['admin', 'facility_admin', 'it_support'],
  afyalink: ['admin', 'facility_admin', 'it_support']
};

export const hasAccess = (tabId, userRole, delegationMap = {}) => {
  // admin (Facility Owner) always has access to everything
  const rolesList = userRole ? userRole.split(',').map(r => r.trim().toLowerCase()) : [];
  if (rolesList.includes('admin')) return true;

  // Check if there is an override in delegationMap
  const allowedRoles = delegationMap && delegationMap[tabId] 
    ? delegationMap[tabId].map(r => r.toLowerCase()) 
    : defaultTabPermissions[tabId] || ['admin', 'facility_admin'];
  
  return rolesList.some(role => allowedRoles.includes(role));
};
