import { getSocketIO } from '../config/socket.js';
import logger from '../config/logger.js';

/** Event name for school notification (Web delivery) */
export const NOTIFICATION_EVENT = 'school_notification';

/**
 * Send notification according to delivery_mode.
 * Used when formName === 'school_notification_master' (POST /api/form-entries).
 *
 * @param {Object} payload - Notification payload from req.body.payload
 */
export async function sendNotificationByDeliveryMode(payload) {

  const notification = {
    ...payload,
    sentAt: new Date().toISOString(),
  };

  const handled = new Set();
  for (const mode of payload?.delivery_mode) {
    const normalized = String(mode).trim();
    if (handled.has(normalized)) continue;
    handled.add(normalized);
    if (normalized === 'Web') {
      sendWebNotification(notification);
    } else if (normalized === 'Email') {
      await sendEmailNotification(notification);
    } else if (normalized === 'SMS') {
      await sendSMSNotification(notification);
    } else {
      logger.warn(`notificationService: unknown delivery_mode "${normalized}"`);
    }
  }
}

/**
 * Emit notification to all connected Socket.IO clients (Web delivery).
 * @param {Object} notification
 */
function sendWebNotification(notification) {
  const io = getSocketIO();
  if (!io) {
    logger.warn('notificationService: Socket.IO not initialized, skipping Web notification');
    return;
  }
  io.emit(NOTIFICATION_EVENT, notification);
  logger.info('notificationService: Web notification emitted', { title: notification.title });
}

/**
 * Email delivery (stub – implement with your email provider).
 * @param {Object} notification
 */
async function sendEmailNotification(notification) {
  // TODO: integrate with nodemailer / SendGrid / SES etc.
  logger.info('notificationService: Email notification (stub)', { title: notification.title });
}

/**
 * SMS delivery (stub – implement with Twilio etc.).
 * @param {Object} notification
 */
async function sendSMSNotification(notification) {
  // TODO: integrate with Twilio / AWS SNS etc.
  logger.info('notificationService: SMS notification (stub)', { title: notification.title });
}
