import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// How notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android requires a notification channel
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'FinTracker',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
    sound: 'default',
  });
}

/**
 * Requests notification permission and returns the Expo push token.
 * Returns null on emulator or if permission denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Skipped — emulator detected.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission denied.');
    return null;
  }

  let tokenData;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '9bac4c49-8543-4587-b675-d914c700a2ed',
    });
  } catch (err) {
    console.warn('[Notifications] Push token fetch failed (requires Firebase setup):', err);
    return null;
  }

  console.log('[Notifications] Token:', tokenData.data);
  return tokenData.data;
}

/**
 * Saves the push token to Supabase, linked to the current user.
 */
export async function storePushToken(userId: string, token: string) {
  const { error } = await supabase.from('user_push_tokens').upsert(
    { user_id: userId, token, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) console.error('[Notifications] Failed to store token:', error);
}

/**
 * Sends a push notification to all other members of a group via Expo Push API.
 */
export async function sendExpenseNotification({
  groupName,
  description,
  paidBy,
  amount,
  memberUserIds,
  currentUserId,
}: {
  groupName: string;
  description: string;
  paidBy: string;
  amount: number;
  memberUserIds: string[];
  currentUserId: string;
}) {
  const otherIds = memberUserIds.filter((id) => id !== currentUserId);
  if (otherIds.length === 0) return;

  const { data: tokenRows, error } = await supabase
    .from('user_push_tokens')
    .select('token')
    .in('user_id', otherIds);

  if (error || !tokenRows || tokenRows.length === 0) return;

  const messages = tokenRows.map((row: { token: string }) => ({
    to: row.token,
    title: `💸 New expense in ${groupName}`,
    body: `${paidBy} paid ₹${amount.toFixed(0)} for "${description}"`,
    sound: 'default',
    data: { groupName },
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    console.log(`[Notifications] Sent to ${messages.length} device(s).`);
  } catch (err) {
    console.error('[Notifications] Push send failed:', err);
  }
}
