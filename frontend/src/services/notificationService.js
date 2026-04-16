import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * INDUSTRIAL NOTIFICATION SYSTEM
 * Handles scheduling of rent and utility reminders with localized sound and persistence.
 */
export const notificationService = {
  // 1. Request OS Permissions
  requestPermissions: async () => {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (e) {
      console.error('Notification Permission Denied:', e);
      return false;
    }
  },

  // 2. Schedule Rental & Utility Reminders
  scheduleStayReminders: async (room) => {
    if (!room || !room.number) return;

    try {
      // Clear existing notifications for this room to avoid duplicates
      await LocalNotifications.cancel({ notifications: [{ id: parseInt(room.number) * 10 }] });

      const notifications = [];
      const now = new Date();

      // RENT REMINDER: 1 day before due date
      if (room.dueDate) {
        const dueDate = new Date(room.dueDate);
        const reminderDate = new Date(dueDate.getTime() - (24 * 60 * 60 * 1000));
        
        if (reminderDate > now) {
          notifications.push({
            title: `🏠 Krishna ERP: Rent Due`,
            body: `Room ${room.number}: Your rent of ₹${room.rent} is due tomorrow (${dueDate.toLocaleDateString()}). Please settle to avoid late fees.`,
            id: parseInt(room.number) * 10 + 1,
            schedule: { at: reminderDate },
            sound: 'res://raw/notification_sound', // Requires sound file in android/app/src/main/res/raw
            attachments: null,
            actionTypeId: '',
            extra: null
          });
        }
      }

      // ELECTRICITY BILL: Every month (simulated if pending)
      if (room.electricityStatus === 'pending' && room.electricityBill > 0) {
        notifications.push({
          title: `⚡ Krishna ERP: Electricity Bill`,
          body: `Room ${room.number}: Pending electricity bill of ₹${room.electricityBill}. Pay now via the app dashboard.`,
          id: parseInt(room.number) * 10 + 2,
          schedule: { at: new Date(Date.now() + 1000 * 60 * 5) }, // Remind in 5 minutes for testing
          sound: 'res://raw/notification_sound'
        });
      }

      // WATER BILL: Every month
      if (room.waterStatus === 'pending' && room.waterBill > 0) {
        notifications.push({
          title: `💧 Krishna ERP: Water Bill`,
          body: `Room ${room.number}: Pending water bill of ₹${room.waterBill} requires attention.`,
          id: parseInt(room.number) * 10 + 3,
          schedule: { at: new Date(Date.now() + 1000 * 60 * 15) }, // Remind in 15 minutes
          sound: 'res://raw/notification_sound'
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    } catch (e) {
      console.error('Notification Scheduling Failure:', e);
    }
  },

  // 3. Clear All
  clearAll: async () => {
    await LocalNotifications.cancel({ notifications: [] });
  }
};
