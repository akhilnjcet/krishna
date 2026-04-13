import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * HapticService - Native tactile feedback for mobile experience
 */
const hapticService = {
  /**
   * Short, subtle vibration for normal button clicks
   */
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Fallback or ignore if not available (e.g. on web)
    }
  },

  /**
   * Hearty vibration for successful actions (e.g. login, payment)
   */
  success: async () => {
    try {
      await Haptics.notification({ type: 'SUCCESS' });
    } catch (e) {}
  },

  /**
   * Warning/Caution vibration
   */
  warning: async () => {
    try {
      await Haptics.notification({ type: 'WARNING' });
    } catch (e) {}
  },

  /**
   * Error vibration
   */
  error: async () => {
    try {
      await Haptics.notification({ type: 'ERROR' });
    } catch (e) {}
  }
};

export default hapticService;
