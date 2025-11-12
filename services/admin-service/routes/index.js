const express = require('express');
const router = express.Router();

const healthController = require('../controllers/healthController');
const userController = require('../controllers/userController');
const auditController = require('../controllers/auditController');
const settingsController = require('../controllers/settingsController');
const statsController = require('../controllers/statsController');
const backupController = require('../controllers/backupController');

const { authenticate, requireAdmin, requireSuperAdmin, extractUserInfo } = require('../middleware/auth');
const { validateObjectId, validateRequired, validateEmail, validatePagination, validateRole, validateStatus } = require('../middleware/validation');

// Public routes
router.get('/health', healthController.health);

// Apply authentication to all routes below
router.use(authenticate);
router.use(extractUserInfo);

// ==================== HEALTH & MONITORING ROUTES ====================

// System health
router.get('/admin/health', healthController.getSystemHealth);
router.get('/admin/health/history', healthController.getHealthHistory);
router.get('/admin/health/metrics', healthController.getMetricsSummary);
router.post('/admin/health/check', requireAdmin, healthController.triggerHealthCheck);

// Service status
router.get('/admin/services', healthController.getServicesStatus);

// ==================== USER MANAGEMENT ROUTES ====================

// User CRUD
router.get('/admin/users', requireAdmin, validatePagination, userController.getAllUsers);
router.get('/admin/users/stats', requireAdmin, userController.getUserStatistics);
router.get('/admin/users/:id', requireAdmin, validateObjectId('id'), userController.getUserById);
router.post('/admin/users',
  requireAdmin,
  validateRequired(['email', 'username', 'password']),
  validateEmail,
  validateRole,
  validateStatus,
  userController.createUser
);
router.put('/admin/users/:id',
  requireAdmin,
  validateObjectId('id'),
  validateEmail,
  validateRole,
  validateStatus,
  userController.updateUser
);
router.delete('/admin/users/:id', requireSuperAdmin, validateObjectId('id'), userController.deleteUser);

// Bulk operations
router.post('/admin/users/bulk', requireAdmin, userController.bulkOperation);

// ==================== AUDIT LOG ROUTES ====================

// Audit logs
router.get('/admin/audit', requireAdmin, validatePagination, auditController.getAuditLogs);
router.get('/admin/audit/stats', requireAdmin, auditController.getAuditStatistics);
router.get('/admin/audit/security', requireAdmin, validatePagination, auditController.getSecurityEvents);
router.get('/admin/audit/export', requireAdmin, auditController.exportAuditLogs);
router.get('/admin/audit/:id', requireAdmin, validateObjectId('id'), auditController.getAuditLogById);

// User activity
router.get('/admin/audit/user/:userId', requireAdmin, validatePagination, auditController.getUserActivity);

// ==================== SYSTEM SETTINGS ROUTES ====================

// Settings
router.get('/admin/settings', settingsController.getSettings);
router.get('/admin/settings/:key', settingsController.getSettingByKey);
router.put('/admin/settings/:key', requireAdmin, settingsController.updateSetting);
router.post('/admin/settings/bulk', requireAdmin, settingsController.bulkUpdateSettings);
router.post('/admin/settings/initialize', requireSuperAdmin, settingsController.initializeDefaults);

// ==================== STATISTICS ROUTES ====================

// System statistics
router.get('/admin/stats', statsController.getSystemStats);
router.get('/admin/stats/users', requireAdmin, statsController.getUserStats);
router.get('/admin/stats/audit', requireAdmin, statsController.getAuditStats);
router.get('/admin/stats/activity', requireAdmin, statsController.getActivityOverview);
router.get('/admin/stats/dashboard', statsController.getDashboardSummary);
router.delete('/admin/stats/cache', requireAdmin, statsController.clearStatsCache);

// ==================== BACKUP & RESTORE ROUTES ====================

// Backup operations
router.post('/admin/backup', requireSuperAdmin, backupController.triggerBackup);
router.get('/admin/backup', requireAdmin, backupController.listBackups);
router.post('/admin/backup/restore', requireSuperAdmin, backupController.restoreBackup);

module.exports = router;
