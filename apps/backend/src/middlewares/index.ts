// ============================================
// EXPORT DES MIDDLEWARES
// ============================================

export {
  authenticate,
  optionalAuth,
  requireRoles,
  requireAdmin,
  requireSupervisor,
  requireStaff,
  requireClient,
  blockNonStaff,
  blockStaff,
} from './auth.middleware.js';
export { AppError, errorHandler, notFoundHandler } from './error.middleware.js';
export {
  validate,
  paginationSchema,
  cuidSchema,
  loginByReferenceSchema,
  adminLoginSchema,
  createTicketSchema,
  updateTicketSchema,
  refreshTokenSchema,
} from './validate.middleware.js';
