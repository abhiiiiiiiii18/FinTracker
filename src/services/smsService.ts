import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

export interface SmsMessage {
  _id: number;
  thread_id: number;
  address: string;
  person: number;
  date: number;
  date_sent: number;
  protocol: number;
  read: number;
  status: number;
  type: number;
  body: string;
  service_center: string;
}

/**
 * Request SMS permissions natively built for Android natively.
 */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);

    return (
      granted['android.permission.READ_SMS'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.RECEIVE_SMS'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.warn('Failed to prompt for SMS permissions:', err);
    return false;
  }
}

/**
 * Fetch the last 24 hours of SMS messages.
 * Filter the messages to only include "Service Headers" (e.g., "AD-HDFCBK")
 * Ignores 10-digit mobile numbers.
 */
export async function fetchServiceSMS(): Promise<SmsMessage[]> {
  if (Platform.OS !== 'android') {
    console.warn('Background SMS tracking is strictly supported on Android only.');
    return [];
  }

  const hasPermission = await requestSmsPermission();
  if (!hasPermission) {
    console.warn('Read/Receive SMS permissions were denied by the user.');
    return [];
  }

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  const filter = {
    box: 'inbox',
    minDate: now - ONE_DAY_MS,
    maxDate: now,
  };

  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => {
        console.error('Failed to fetch SMS native bridge:', fail);
        reject(new Error(fail));
      },
      (count: number, smsList: string) => {
        try {
          const messages: SmsMessage[] = JSON.parse(smsList);
          
          // Filter out typical private mobile numbers to only get service headers
          // We apply the specific regex format for bank/transaction service headers.
          const filtered = messages.filter((msg) => {
            const address = msg.address || '';
            
            // First pass fail-safe: explicitly reject any strict multi-numeric sequences.
            const isPhoneNumber = /^\+?\d{10,15}$/.test(address);
            if (isPhoneNumber) return false;
            
            // Target header format string:
            // e.g., AD-HDFCBK, VK-ICICIB, DM-SBIGRO
            // 2 letters, optional trailing hyphen, 6 alphanumerics.
            const isServiceHeader = /^[a-zA-Z]{2}-?[a-zA-Z0-9]{6}$/.test(address);
            
            return isServiceHeader;
          });
          
          resolve(filtered);
        } catch (e) {
          console.error('Failed to parse the SMS list returned by Android', e);
          reject(e);
        }
      }
    );
  });
}
