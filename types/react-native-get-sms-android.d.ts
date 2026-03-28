declare module 'react-native-get-sms-android' {
  export interface Filter {
    box?: string;
    minDate?: number;
    maxDate?: number;
    indexFrom?: number;
    maxCount?: number;
    read?: number;
    address?: string;
    body?: string;
  }

  export default class SmsAndroid {
    static list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ): void;

    static send(
      addresses: string,
      text: string,
      fail: (error: string) => void,
      success: (status: string) => void
    ): void;
  }
}
