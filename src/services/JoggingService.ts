
import db from '../contexts/DatabaseContext';
import { JoggingSession, LocationPoint } from '../types';

export class JoggingService {
  // Start a new jogging session
  async startSession(): Promise<number> {
    return await db.joggingSessions.add({
      id: Date.now(),
      startTime: new Date()
    });
  }

  // Add a location point to the current session
  async addLocationPoint(sessionId: number, point: LocationPoint): Promise<number> {
    return await db.locationPoints.add({
      ...point,
      sessionId
    });
  }

  // End a jogging session
  async endSession(sessionId: number, stats: Partial<JoggingSession>): Promise<void> {
    await db.joggingSessions.update(sessionId, {
      endTime: new Date(),
      totalDistance: stats.totalDistance || 0,
      averageSpeed: stats.averageSpeed || 0,
      maxSpeed: stats.maxSpeed || 0,
      duration: stats.duration || 0
    });
  }

  // Get all jogging sessions
  async getSessions(): Promise<JoggingSession[]> {
    const sessions = await db.joggingSessions.orderBy('startTime').reverse().toArray();
    return sessions;
  }

  // Get location points for a specific session
  async getSessionLocations(sessionId: number): Promise<LocationPoint[]> {
    return await db.locationPoints
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
  }

  // Get a specific jogging session
  async getSession(sessionId: number): Promise<JoggingSession | undefined> {
    return await db.joggingSessions.get(sessionId);
  }

  // Delete a jogging session
  async deleteSession(sessionId: number): Promise<void> {
    await db.locationPoints.where('sessionId').equals(sessionId).delete();
    await db.joggingSessions.delete(sessionId);
  }
}
