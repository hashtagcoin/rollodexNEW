import { Platform, Alert as RNAlert } from 'react-native';

// Web-compatible Alert function
export const Alert = Platform.select({
  web: {
    alert: (title, message, buttons) => {
      if (buttons && buttons.length > 1) {
        // For multiple buttons, use confirm
        const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
        if (confirmed && buttons[1]?.onPress) {
          buttons[1].onPress();
        } else if (!confirmed && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      } else {
        // Single button or no buttons
        window.alert(message ? `${title}\n\n${message}` : title);
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    }
  },
  default: RNAlert
});