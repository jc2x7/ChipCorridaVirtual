/**
 * Background Location Task
 *
 * This task is registered once and handles GPS tracking in the background.
 * It validates checkpoints when the user is within 100m radius.
 *
 * NOTE: This task must be registered at the root level of the app,
 * before any navigator is mounted. The task definition must live in a
 * file that is imported early in the app lifecycle (e.g., _layout.tsx).
 *
 * Usage: Import this file in app/_layout.tsx to register the task.
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Config } from '@/constants/config';
import { trackingService } from '@/services/trackingService';
import { raceService } from '@/services/raceService';

// This map stores active race tracking state
// It is updated from the TrackingStore before starting background tracking
const activeTracking: {
  raceId: string | null;
  trackingId: string | null;
  userId: string | null;
} = {
  raceId: null,
  trackingId: null,
  userId: null,
};

export function setBackgroundTrackingContext(
  raceId: string,
  trackingId: string,
  userId: string
) {
  activeTracking.raceId = raceId;
  activeTracking.trackingId = trackingId;
  activeTracking.userId = userId;
}

export function clearBackgroundTrackingContext() {
  activeTracking.raceId = null;
  activeTracking.trackingId = null;
  activeTracking.userId = null;
}

TaskManager.defineTask(
  Config.BACKGROUND_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) {
      console.error('[BackgroundLocation] Error:', error);
      return;
    }

    if (!data?.locations?.length) return;
    if (!activeTracking.raceId || !activeTracking.trackingId) return;

    const location = data.locations[0];
    const { latitude, longitude } = location.coords;

    try {
      // Update last known position
      await trackingService.updateLastPosition(
        activeTracking.trackingId,
        latitude,
        longitude
      );

      // Get current race and tracking
      const race = await raceService.getRace(activeTracking.raceId);
      if (!race || race.status !== 'active') return;

      const tracking = await trackingService.getMyTracking(
        activeTracking.raceId,
        activeTracking.userId!
      );
      if (!tracking || tracking.isFinished) return;

      // Check checkpoints
      const nextCp = trackingService.checkAndRecordCheckpoints(
        tracking,
        race,
        latitude,
        longitude,
        race.startTime
      );

      if (nextCp) {
        const sorted = [...race.checkpoints].sort(
          (a, b) => a.order - b.order
        );
        const cpIndex = sorted.findIndex(
          (c) => c.id === nextCp.checkpointId
        );
        const isFinish = cpIndex === sorted.length - 1;

        await trackingService.recordCheckpoint(
          activeTracking.trackingId,
          nextCp,
          race.startTime,
          isFinish
        );

        console.log(
          `[BackgroundLocation] Checkpoint passed: ${nextCp.checkpointName}${isFinish ? ' (FINISH!)' : ''}`
        );
      }
    } catch (err) {
      console.error('[BackgroundLocation] Tracking error:', err);
    }
  }
);
