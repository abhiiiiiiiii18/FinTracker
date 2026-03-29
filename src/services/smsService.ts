import { Alert, PermissionsAndroid, Platform } from 'react-native';
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
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message: 'This app needs access to your SMS to read financial transactions.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
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
    Alert.alert('Permission Denied', 'Cannot read SMS without permissions.');
    return [];
  }

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  
  const filter = {
    box: 'inbox',
    minDate: now - THIRTY_DAYS_MS,
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
          const filtered = messages.filter((msg) => {
            const address = msg.address || '';
            
            // Explicitly reject any strict multi-numeric sequences (phone numbers).
            const isPhoneNumber = /^\+?\d{10,15}$/.test(address);
            if (isPhoneNumber) return false;
            
            // Allow any address that contains at least one letter (service headers)
            return /[a-zA-Z]/.test(address);
          });
          
          if (filtered.length === 0) {
            Alert.alert('No valid messages', 'Could not find any transaction SMS in the last 30 days.');
          }
          
          resolve(filtered);
        } catch (e) {
          console.error('Failed to parse the SMS list returned by Android', e);
          reject(e);
        }
      }
    );
  });
}
