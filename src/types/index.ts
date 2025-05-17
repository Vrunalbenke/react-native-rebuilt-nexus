
export interface JoggingSession {
  id: number;
  startTime: Date;
  endTime?: Date;
  totalDistance?: number; // in meters
  averageSpeed?: number; // in meters per second
  maxSpeed?: number; // in meters per second
  duration?: number; // in seconds
}

export interface LocationPoint {
  id?: number;
  sessionId?: number;
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number; // in meters per second
}
