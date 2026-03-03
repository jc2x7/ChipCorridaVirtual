import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Config } from '@/constants/config';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const { status: fg } =
        await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') {
        setError('Permissão de localização negada.');
        return false;
      }
      const { status: bg } =
        await Location.requestBackgroundPermissionsAsync();
      if (bg !== 'granted') {
        setError('Permissão de localização em segundo plano negada.');
        return false;
      }
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (e) {
      setError('Erro ao solicitar permissão de localização.');
      return false;
    }
  }, []);

  const startForegroundTracking = useCallback(async () => {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (loc) => {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
        });
      }
    );
    return sub;
  }, []);

  const startBackgroundTracking = useCallback(async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      Config.BACKGROUND_LOCATION_TASK
    );
    if (!isRegistered) return;

    const isStarted = await Location.hasStartedLocationUpdatesAsync(
      Config.BACKGROUND_LOCATION_TASK
    );
    if (isStarted) return;

    await Location.startLocationUpdatesAsync(Config.BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: Config.LOCATION_UPDATE_INTERVAL_MS,
      distanceInterval: Config.LOCATION_DISTANCE_INTERVAL_M,
      foregroundService: {
        notificationTitle: 'ChipCorrida Virtual',
        notificationBody: 'Rastreando sua corrida...',
        notificationColor: '#EF4444',
      },
      showsBackgroundLocationIndicator: true,
    });
  }, []);

  const stopBackgroundTracking = useCallback(async () => {
    try {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(
        Config.BACKGROUND_LOCATION_TASK
      );
      if (isStarted) {
        await Location.stopLocationUpdatesAsync(Config.BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // ignore
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      };
    } catch {
      return null;
    }
  }, []);

  return {
    location,
    permissionGranted,
    error,
    requestPermissions,
    startForegroundTracking,
    startBackgroundTracking,
    stopBackgroundTracking,
    getCurrentLocation,
  };
}
