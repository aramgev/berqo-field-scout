import * as DeviceLocation from 'expo-location';
import { Location, LocationProvider } from '../domain';

export class PhoneLocation implements LocationProvider {
  async current(): Promise<Location> {
    if (!(await DeviceLocation.requestForegroundPermissionsAsync()).granted) throw new Error('GPS_DENIED');
    if (!(await DeviceLocation.hasServicesEnabledAsync())) throw new Error('GPS_OFF');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const fix = await Promise.race([
        DeviceLocation.getCurrentPositionAsync({ accuracy: DeviceLocation.Accuracy.High }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('GPS_TIMEOUT')), 25000); }),
      ]);
      return { latitude: fix.coords.latitude, longitude: fix.coords.longitude,
        accuracy: fix.coords.accuracy ?? undefined, source: 'gps', recordedAt: new Date(fix.timestamp).toISOString() };
    } finally { if (timer) clearTimeout(timer); }
  }
}
