
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingService } from '../services/JoggingService';
import { LocationPoint } from '../types';
import { Play, Pause, StopCircle, ArrowLeft } from 'lucide-react';
import { 
  calculateTotalDistance, 
  calculateAverageSpeed, 
  calculateMaxSpeed, 
  formatDistance, 
  formatDuration,
  formatSpeed
} from '../utils/locationUtils';
import 'leaflet/dist/leaflet.css';

// LocationUpdater component to handle location events and map updates
const LocationUpdater = ({ 
  onLocationChange, 
  isPaused, 
  isTracking 
}: { 
  onLocationChange: (location: GeolocationPosition) => void;
  isPaused: boolean;
  isTracking: boolean;
}) => {
  const map = useMap();
  
  // Set up geolocation watching
  useEffect(() => {
    let watchId: number;
    
    if (isTracking && !isPaused) {
      // Start watching position
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          onLocationChange(position);
          
          // Center map on user's position
          map.setView(
            [position.coords.latitude, position.coords.longitude],
            map.getZoom()
          );
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 0, 
          timeout: 5000 
        }
      );
    }
    
    // Cleanup function
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, isPaused, map, onLocationChange]);
  
  return null;
};

const JoggingPage: React.FC = () => {
  const { db, isLoading: dbLoading } = useDatabase();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef(0);
  const lastPauseTimeRef = useRef<number | null>(null);
  
  // Check for geolocation permissions
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        
        // Get initial location if permission is granted
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const initialLocation: LocationPoint = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().getTime(),
                speed: position.coords.speed || 0,
              };
              setCurrentLocation(initialLocation);
            },
            (error) => {
              console.error('Error getting initial location:', error);
            }
          );
        }
      });
    } else {
      setPermissionStatus('unsupported');
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const handleLocationChange = (position: GeolocationPosition) => {
    const newLocation: LocationPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: position.timestamp,
      speed: position.coords.speed !== null ? position.coords.speed : 0,
    };
    
    setCurrentLocation(newLocation);
    
    if (isTracking && !isPaused) {
      setLocations(prev => [...prev, newLocation]);
      
      // Save location to database
      if (sessionId !== null) {
        const joggingService = new JoggingService();
        joggingService.addLocationPoint(sessionId, newLocation)
          .catch(err => console.error('Error saving location:', err));
      }
      
      // Update stats
      const allLocations = [...locations, newLocation];
      const totalDistance = calculateTotalDistance(allLocations);
      const avgSpeed = calculateAverageSpeed(allLocations);
      const maxSpd = calculateMaxSpeed(allLocations);
      
      setDistance(totalDistance);
      setCurrentSpeed(newLocation.speed || 0);
      setAverageSpeed(avgSpeed);
      setMaxSpeed(maxSpd);
    }
  };
  
  const startTracking = async () => {
    try {
      // Create a new session in the database
      const joggingService = new JoggingService();
      const id = await joggingService.startSession();
      setSessionId(id);
      
      // Start time tracking
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setElapsedTime(0);
      
      timerRef.current = setInterval(() => {
        if (startTimeRef.current && !isPaused) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
      
      setIsTracking(true);
      setIsPaused(false);
      setLocations([]);
      
      toast({
        title: "Tracking Started",
        description: "Your jogging session is now being tracked"
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast({
        title: "Error",
        description: "Failed to start tracking",
        variant: "destructive"
      });
    }
  };
  
  const togglePause = () => {
    if (isPaused) {
      // Resume tracking
      if (lastPauseTimeRef.current) {
        pausedTimeRef.current += (Date.now() - lastPauseTimeRef.current);
        lastPauseTimeRef.current = null;
      }
      toast({
        title: "Tracking Resumed",
        description: "Your jogging session has been resumed"
      });
    } else {
      // Pause tracking
      lastPauseTimeRef.current = Date.now();
      toast({
        title: "Tracking Paused",
        description: "Your jogging session is paused"
      });
    }
    
    setIsPaused(!isPaused);
  };
  
  const stopTracking = async () => {
    if (sessionId === null) {
      toast({
        title: "Error",
        description: "Session not properly initialized",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Calculate final stats
      const totalDistance = calculateTotalDistance(locations);
      const avgSpeed = calculateAverageSpeed(locations);
      const maxSpd = calculateMaxSpeed(locations);
      
      // Save session data to database
      const joggingService = new JoggingService();
      await joggingService.endSession(sessionId, {
        totalDistance,
        averageSpeed: avgSpeed,
        maxSpeed: maxSpd,
        duration: elapsedTime,
      });
      
      toast({
        title: "Jogging Session Saved",
        description: `You completed ${formatDistance(totalDistance)} km in ${formatDuration(elapsedTime)}`
      });
      
      // Navigate to home screen
      navigate('/');
      
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast({
        title: "Error",
        description: "Failed to save tracking data",
        variant: "destructive"
      });
    } finally {
      setIsTracking(false);
      setIsPaused(false);
      setSessionId(null);
    }
  };
  
  // For rendering permission error
  if (permissionStatus === 'denied') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Location Permission Required</h1>
        <p className="mb-6">
          This app needs location permission to track your jogging route.
          Please enable location permission in your browser settings.
        </p>
        <Button onClick={() => navigate('/')}>
          Go Back
        </Button>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Map area */}
      <div className="flex-grow relative">
        {currentLocation ? (
          <MapContainer
            center={[currentLocation.latitude, currentLocation.longitude]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {isTracking && locations.length > 1 && (
              <Polyline
                positions={locations.map(loc => [loc.latitude, loc.longitude])}
                pathOptions={{ color: '#0066cc', weight: 5 }}
              />
            )}

            {currentLocation && (
              <Circle
                center={[currentLocation.latitude, currentLocation.longitude]}
                radius={5}
                pathOptions={{ fillColor: '#0066cc', color: '#ffffff', weight: 2, fillOpacity: 1 }}
              />
            )}

            <LocationUpdater
              onLocationChange={handleLocationChange}
              isPaused={isPaused}
              isTracking={isTracking}
            />
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Stats Panel */}
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-2 p-4">
            <div className="text-center">
              <p className="text-xl font-bold">{formatDistance(distance)} km</p>
              <p className="text-xs text-slate-500">Distance</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{formatDuration(elapsedTime)}</p>
              <p className="text-xs text-slate-500">Duration</p>
            </div>
          </div>
          <div className="grid grid-cols-2 p-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-xl font-bold">{formatSpeed(currentSpeed)} km/h</p>
              <p className="text-xs text-slate-500">Current Speed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{formatSpeed(averageSpeed)} km/h</p>
              <p className="text-xs text-slate-500">Average Speed</p>
            </div>
          </div>
        </div>

        {/* Back button */}
        <Button 
          variant="secondary" 
          size="sm"
          className="absolute bottom-4 left-4 opacity-80 z-[500]"
          onClick={() => {
            if (isTracking) {
              toast({
                title: "Session in Progress",
                description: "Please stop tracking before going back",
                variant: "destructive"
              });
            } else {
              navigate('/');
            }
          }}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-4 shadow-md">
        {!isTracking ? (
          <Button className="w-full py-6" size="lg" onClick={startTracking}>
            <Play className="mr-2" /> Start Tracking
          </Button>
        ) : (
          <div className="flex gap-4">
            <Button 
              variant={isPaused ? "default" : "secondary"}
              className="flex-1 py-6"
              size="lg" 
              onClick={togglePause}
            >
              {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex-1 py-6"
                  size="lg"
                >
                  <StopCircle className="mr-2" /> Stop
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Session</AlertDialogTitle>
                  <AlertDialogDescription>
                    Do you want to stop and save this jogging session?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={stopTracking}>
                    Stop & Save
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoggingPage;
