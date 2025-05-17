
import { SQLiteDatabase } from 'expo-sqlite';
import { JoggingSession, LocationPoint } from '../types';

export class JoggingService {
  constructor(private db: SQLiteDatabase) {}

  // Start a new jogging session
  async startSession(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO jogging_sessions (start_time) VALUES (?)',
          [Date.now()],
          (_, { insertId }) => {
            resolve(insertId);
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Add a location point to the current session
  async addLocationPoint(sessionId: number, point: LocationPoint): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO location_points (session_id, latitude, longitude, timestamp, speed) VALUES (?, ?, ?, ?, ?)',
          [sessionId, point.latitude, point.longitude, point.timestamp, point.speed || 0],
          (_, __) => {
            resolve();
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // End a jogging session
  async endSession(sessionId: number, stats: Partial<JoggingSession>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `UPDATE jogging_sessions 
           SET end_time = ?, total_distance = ?, average_speed = ?, max_speed = ?, duration = ?
           WHERE id = ?`,
          [
            Date.now(),
            stats.totalDistance || 0,
            stats.averageSpeed || 0,
            stats.maxSpeed || 0,
            stats.duration || 0,
            sessionId
          ],
          (_, __) => {
            resolve();
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Get all jogging sessions
  async getSessions(): Promise<JoggingSession[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM jogging_sessions ORDER BY start_time DESC',
          [],
          (_, { rows }) => {
            const sessions: JoggingSession[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              sessions.push({
                id: row.id,
                startTime: new Date(row.start_time),
                endTime: row.end_time ? new Date(row.end_time) : undefined,
                totalDistance: row.total_distance,
                averageSpeed: row.average_speed,
                maxSpeed: row.max_speed,
                duration: row.duration
              });
            }
            resolve(sessions);
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Get location points for a specific session
  async getSessionLocations(sessionId: number): Promise<LocationPoint[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM location_points WHERE session_id = ? ORDER BY timestamp ASC',
          [sessionId],
          (_, { rows }) => {
            const points: LocationPoint[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              points.push({
                id: row.id,
                sessionId: row.session_id,
                latitude: row.latitude,
                longitude: row.longitude,
                timestamp: row.timestamp,
                speed: row.speed
              });
            }
            resolve(points);
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Get a specific jogging session
  async getSession(sessionId: number): Promise<JoggingSession | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM jogging_sessions WHERE id = ?',
          [sessionId],
          (_, { rows }) => {
            if (rows.length === 0) {
              resolve(null);
              return;
            }
            
            const row = rows.item(0);
            resolve({
              id: row.id,
              startTime: new Date(row.start_time),
              endTime: row.end_time ? new Date(row.end_time) : undefined,
              totalDistance: row.total_distance,
              averageSpeed: row.average_speed,
              maxSpeed: row.max_speed,
              duration: row.duration
            });
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Delete a jogging session
  async deleteSession(sessionId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM location_points WHERE session_id = ?',
          [sessionId],
          (_, __) => {
            tx.executeSql(
              'DELETE FROM jogging_sessions WHERE id = ?',
              [sessionId],
              (_, __) => {
                resolve();
              },
              (_, error): boolean => {
                reject(error);
                return false;
              }
            );
          },
          (_, error): boolean => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}
