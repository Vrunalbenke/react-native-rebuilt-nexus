
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { JoggingService } from '../services/JoggingService';
import { JoggingSession } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/locationUtils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDatabase } from '../contexts/DatabaseContext';

const HomePage: React.FC = () => {
  const { db, isLoading: dbLoading } = useDatabase();
  const [sessions, setSessions] = useState<JoggingSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!dbLoading) {
      loadSessions();
    }
  }, [dbLoading]);
  
  const loadSessions = async () => {
    try {
      setLoading(true);
      const joggingService = new JoggingService();
      const sessionsData = await joggingService.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading jogging sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Jogging Tracker</h1>
        <p className="text-slate-600 mt-2">Track your runs and analyze your progress</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-8">
        <Link to="/jogging">
          <Button className="w-full py-6 text-lg" size="lg">
            Start Jogging
          </Button>
        </Link>
        
        <Link to="/history">
          <Button variant="outline" className="w-full py-6 text-lg" size="lg">
            View History
          </Button>
        </Link>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4 text-slate-800">Recent Jogs</h2>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid gap-4">
            {sessions.slice(0, 3).map((session) => (
              <Link to={`/jogging-detail/${session.id}`} key={session.id}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500 mb-2">
                      {session.startTime.toLocaleDateString()} - {session.startTime.toLocaleTimeString()}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center">
                        <p className="font-semibold">{formatDistance(session.totalDistance || 0)} km</p>
                        <p className="text-xs text-slate-500">Distance</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{formatDuration(session.duration || 0)}</p>
                        <p className="text-xs text-slate-500">Duration</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{formatSpeed(session.averageSpeed || 0)} km/h</p>
                        <p className="text-xs text-slate-500">Avg Speed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center p-8 text-slate-500">No jogging sessions recorded yet</p>
        )}
      </div>
    </div>
  );
};

export default HomePage;
