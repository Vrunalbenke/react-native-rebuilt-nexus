
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isLoading: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isLoading: true,
});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Open the database
    const database = SQLite.openDatabase('jogging.db');
    
    // Create tables if they don't exist
    database.transaction(tx => {
      // Create jogging sessions table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS jogging_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          total_distance REAL,
          average_speed REAL,
          max_speed REAL,
          duration INTEGER
        );`
      );
      
      // Create location points table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS location_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp INTEGER NOT NULL,
          speed REAL,
          FOREIGN KEY (session_id) REFERENCES jogging_sessions (id) ON DELETE CASCADE
        );`
      );
    }, 
    error => {
      console.error('Database setup error:', error);
    },
    () => {
      setDb(database);
      setIsLoading(false);
    });
    
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isLoading }}>
      {children}
    </DatabaseContext.Provider>
  );
};
