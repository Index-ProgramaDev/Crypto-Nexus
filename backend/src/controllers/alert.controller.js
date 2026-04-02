import { AlertService } from '../services/alert.service.js';
import { createAlertSchema, alertQuerySchema, uuidParamSchema } from '../utils/validation.js';
import { asyncHandler } from '../middleware/error.js';

export const AlertController = {
  /**
   * Get user's alerts
   * GET /api/v1/alerts
   */
  getAlerts: asyncHandler(async (req, res) => {
    const filters = alertQuerySchema.parse(req.query);
    const alerts = await AlertService.getUserAlerts(req.user, filters);

    res.json({
      success: true,
      data: { alerts }
    });
  }),

  /**
   * Get unread alert count
   * GET /api/v1/alerts/count
   */
  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await AlertService.getUnreadCount(req.user);

    res.json({
      success: true,
      data: { count }
    });
  }),

  /**
   * Create alert (admin only)
   * POST /api/v1/alerts
   */
  createAlert: asyncHandler(async (req, res) => {
    const validatedData = createAlertSchema.parse(req.body);
    const alert = await AlertService.createAlert(validatedData);

    res.status(201).json({
      success: true,
      data: { alert }
    });
  }),

  /**
   * Mark alert as read
   * PATCH /api/v1/alerts/:id/read
   */
  markAsRead: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    const alert = await AlertService.markAsRead(id, req.user.email);

    res.json({
      success: true,
      data: { alert }
    });
  }),

  /**
   * Delete alert (admin only)
   * DELETE /api/v1/alerts/:id
   */
  deleteAlert: asyncHandler(async (req, res) => {
    const { id } = uuidParamSchema.parse(req.params);
    await AlertService.deleteAlert(id);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  })
};
