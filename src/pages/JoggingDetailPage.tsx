
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingService } from '../services/JoggingService';
import { JoggingSession, LocationPoint } from '../types';
import { formatDistance, formatDuration, formatSpeed, getSpeedColor } from '../utils/locationUtils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Auto fit bounds component
const FitBounds = ({ locations }: { locations: LocationPoint[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, map]);
  
  return null;
};

const JoggingDetailPage: React.FC = () => {
  const { db, isLoading: dbLoading } = useDatabase();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<JoggingSession | null>(null);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!dbLoading && sessionId) {
      loadSessionData(parseInt(sessionId, 10));
    }
  }, [dbLoading, sessionId]);
  
  const loadSessionData = async (id: number) => {
    try {
      setLoading(true);
      const joggingService = new JoggingService();
      
      // Load session details
      const sessionData = await joggingService.getSession(id);
      if (sessionData) {
        setSession(sessionData);
      }
      
      // Load location points
      const locationPoints = await joggingService.getSessionLocations(id);
      setLocations(locationPoints);
      
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Render route with color segments based on speed
  const renderRouteSegments = () => {
    if (locations.length < 2) return null;
    
    return locations.slice(0, -1).map((point, index) => {
      const nextPoint = locations[index + 1];
      const speed = nextPoint.speed || 0;
      const color = getSpeedColor(speed);
      
      return (
        <Polyline
          key={index}
          positions={[
            [point.latitude, point.longitude],
            [nextPoint.latitude, nextPoint.longitude]
          ]}
          pathOptions={{ color, weight: 5 }}
        />
      );
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-red-500">Session not found</p>
        <Link to="/history">
          <Button className="mt-4">Back to History</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Jogging Details</h1>
        <Link to="/history">
          <Button variant="ghost">Back</Button>
        </Link>
      </div>
      
      <div className="mb-6">
        <p className="text-lg">
          {format(session.startTime, 'MMMM d, yyyy')} - {format(session.startTime, 'h:mm a')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-2">Distance</p>
            <p className="text-2xl font-bold">{formatDistance(session.totalDistance || 0)} km</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-2">Duration</p>
            <p className="text-2xl font-bold">{formatDuration(session.duration || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-2">Average Speed</p>
            <p className="text-2xl font-bold">{formatSpeed(session.averageSpeed || 0)} km/h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500 mb-2">Max Speed</p>
            <p className="text-2xl font-bold">{formatSpeed(session.maxSpeed || 0)} km/h</p>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Route Map</h2>
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-0 h-[400px]">
          {locations.length > 0 ? (
            <MapContainer
              center={[locations[0].latitude, locations[0].longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {renderRouteSegments()}
              
              {locations.length > 0 && (
                <Marker position={[locations[0].latitude, locations[0].longitude]} />
              )}
              
              {locations.length > 1 && (
                <Marker position={[locations[locations.length - 1].latitude, locations[locations.length - 1].longitude]} />
              )}
              
              <FitBounds locations={locations} />
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <p className="text-slate-500">No route data available</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-3">Speed Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center">
            <div className="w-6 h-3 mr-2 rounded-full" style={{ backgroundColor: '#3498db' }}></div>
            <span className="text-sm">Walking</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 mr-2 rounded-full" style={{ backgroundColor: '#2ecc71' }}></div>
            <span className="text-sm">Light Jog</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 mr-2 rounded-full" style={{ backgroundColor: '#f1c40f' }}></div>
            <span className="text-sm">Jogging</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 mr-2 rounded-full" style={{ backgroundColor: '#e67e22' }}></div>
            <span className="text-sm">Fast Jog</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-3 mr-2 rounded-full" style={{ backgroundColor: '#e74c3c' }}></div>
            <span className="text-sm">Running</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoggingDetailPage;
