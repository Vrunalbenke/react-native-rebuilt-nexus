
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { JoggingService } from '../services/JoggingService';
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingSession } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/locationUtils';
import { useToast } from "@/hooks/use-toast";

const HistoryPage: React.FC = () => {
  const { db, isLoading: dbLoading } = useDatabase();
  const [sessions, setSessions] = useState<JoggingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
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
      toast({
        title: "Error",
        description: "Failed to load jogging history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteSession = async (sessionId: number) => {
    try {
      const joggingService = new JoggingService();
      await joggingService.deleteSession(sessionId);
      
      // Refresh the list
      loadSessions();
      toast({
        title: "Success",
        description: "Session deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete jogging session",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Jogging History</h1>
        <Link to="/">
          <Button variant="ghost">Back</Button>
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : sessions.length > 0 ? (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">{session.startTime.toLocaleDateString()}</p>
                    <p className="text-sm text-slate-500">{session.startTime.toLocaleTimeString()} - {formatDuration(session.duration || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Jogging Session</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this session? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSession(session.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Link to={`/jogging-detail/${session.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <p className="font-semibold">{formatDistance(session.totalDistance || 0)} km</p>
                    <p className="text-xs text-slate-500">Distance</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <p className="font-semibold">{formatSpeed(session.averageSpeed || 0)} km/h</p>
                    <p className="text-xs text-slate-500">Avg Speed</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <p className="font-semibold">{formatSpeed(session.maxSpeed || 0)} km/h</p>
                    <p className="text-xs text-slate-500">Max Speed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-slate-50 rounded-lg">
          <p className="text-slate-500 mb-4">No jogging sessions recorded yet</p>
          <Link to="/jogging">
            <Button>Start Jogging</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
