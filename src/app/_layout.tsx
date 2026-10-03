import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FieldScoutProvider } from '../fieldScout/ui/Provider';
export default function Layout() {
  return <SafeAreaProvider><FieldScoutProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></FieldScoutProvider></SafeAreaProvider>;
}
