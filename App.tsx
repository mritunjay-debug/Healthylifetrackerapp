import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import {
  configureNotificationModule,
  requestNotificationPermissionsAndChannel,
} from './lib/setupAppNotifications';
import { registerForPushNotifications } from './lib/pushNotifications';
import { requestAllSensorPermissions } from './lib/sensorPermissions';

configureNotificationModule();

export default function App() {
  // Preload icon fonts for web - required for icons to display correctly
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    requestNotificationPermissionsAndChannel();
    registerForPushNotifications();
    requestAllSensorPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          {!fontsLoaded ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AppNavigator />
              <StatusBar style="auto" translucent={false} />
            </GestureHandlerRootView>
          )}
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
