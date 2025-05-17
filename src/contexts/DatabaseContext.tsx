
import React, { createContext, useContext } from 'react';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { JoggingSession, LocationPoint } from '../types';

// Create a Dexie database
class JoggingDatabase extends Dexie {
  joggingSessions!: Dexie.Table<JoggingSession, number>;
  locationPoints!: Dexie.Table<LocationPoint, number>;

  constructor() {
    super('joggingTracker');
    this.version(1).stores({
      joggingSessions: '++id, startTime, endTime',
      locationPoints: '++id, sessionId, timestamp'
    });
  }
}

const db = new JoggingDatabase();

interface DatabaseContextType {
  db: JoggingDatabase;
  isLoading: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db,
  isLoading: false
});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We'll use a simple query to check if the database is ready
  const isReady = useLiveQuery(() => db.joggingSessions.count().then(() => true).catch(() => false), [], false);

  return (
    <DatabaseContext.Provider value={{ db, isLoading: !isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export default db;
