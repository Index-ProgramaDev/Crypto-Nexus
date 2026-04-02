// Contact info detection patterns (same as frontend, but enforced on backend)
const CONTACT_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // email
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g, // phone
  /@[a-zA-Z0-9_]{2,30}/g, // social media handles
  /(?:instagram|telegram|whatsapp|twitter|tiktok|discord|facebook|linkedin)[\s.:\/]*[a-zA-Z0-9_.\/]+/gi,
  /(?:t\.me|wa\.me|bit\.ly|linktr\.ee)\/[a-zA-Z0-9_]+/gi, // short links
  /https?:\/\/[^\s]+/gi, // URLs
];

/**
 * Detect contact information in text
 * @param {string} text - Text to analyze
 * @returns {Object} { hasContact: boolean, matches: string[] }
 */
export function detectContactInfo(text) {
  if (!text || typeof text !== 'string') {
    return { hasContact: false, matches: [] };
  }
  
  const matches = [];
  for (const pattern of CONTACT_PATTERNS) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  return {
    hasContact: matches.length > 0,
    matches: [...new Set(matches)]
  };
}

/**
 * Get violation action based on count
 * @param {number} violationCount - Current violation count
 * @returns {string} Action to take
 */
export function getViolationAction(violationCount) {
  if (violationCount === 0) return 'warning';
  if (violationCount === 1) return 'message_sent';
  if (violationCount === 2) return 'blocked_30_days';
  return 'permanent_ban';
}

/**
 * Get warning message for violation
 * @param {number} attemptNumber - Attempt number
 * @returns {string} Warning message
 */
export function getWarningMessage(attemptNumber) {
  switch (attemptNumber) {
    case 1:
      return 'Seu conteúdo foi bloqueado por conter informações de contato pessoal. Isso não é permitido na comunidade.';
    case 2:
      return 'Você tentou compartilhar informações de contato pessoal novamente. Caso tente mais uma vez, sua conta será bloqueada por 30 dias.';
    case 3:
      return 'Sua conta foi bloqueada por 30 dias por violações repetidas das regras da comunidade.';
    default:
      return 'Sua conta foi banida permanentemente da comunidade por violações repetidas.';
  }
}

/**
 * Check if user can view content at access level
 * @param {string} userRole - User role
 * @param {boolean} vipAccess - User VIP access
 * @param {string} contentLevel - Content access level
 * @returns {boolean} True if can view
 */
export function canViewContent(userRole, vipAccess, contentLevel) {
  if (userRole === 'admin') return true;
  if (contentLevel === 'vip') return vipAccess;
  
  const levels = { public: 0, mentored: 1, advanced: 2, vip: 3 };
  const roleLevel = { user: 0, mentored: 1, advanced: 2, admin: 3 };
  
  return (roleLevel[userRole] || 0) >= (levels[contentLevel] || 0);
}

/**
 * Get role badge info
 * @param {string} role - User role
 * @param {boolean} vipAccess - VIP access
 * @returns {Object} Badge info
 */
export function getRoleBadge(role, vipAccess) {
  if (role === 'admin') return { label: 'Admin', color: 'text-destructive' };
  if (vipAccess) return { label: 'VIP', color: 'text-neon-purple' };
  if (role === 'advanced') return { label: 'Avançado', color: 'text-neon-blue' };
  if (role === 'mentored') return { label: 'Mentorado', color: 'text-primary' };
  return { label: 'Membro', color: 'text-muted-foreground' };
}
