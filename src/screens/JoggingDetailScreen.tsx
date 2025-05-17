
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingService } from '../services/JoggingService';
import { JoggingSession, LocationPoint } from '../types';
import { 
  formatDistance, 
  formatDuration, 
  formatSpeed, 
  getSpeedColor 
} from '../utils/locationUtils';
import { useRoute } from '@react-navigation/native';

interface RouteParams {
  sessionId: number;
}

const JoggingDetailScreen: React.FC = () => {
  const { db } = useDatabase();
  const route = useRoute();
  const [session, setSession] = useState<JoggingSession | null>(null);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);
  
  const { sessionId } = route.params as RouteParams;
  
  useEffect(() => {
    if (db && sessionId) {
      loadSessionData();
    }
  }, [db, sessionId]);
  
  const loadSessionData = async () => {
    if (!db) return;
    
    try {
      setLoading(true);
      const joggingService = new JoggingService(db);
      
      // Load session details
      const sessionData = await joggingService.getSession(sessionId);
      if (sessionData) {
        setSession(sessionData);
      }
      
      // Load location points
      const locationPoints = await joggingService.getSessionLocations(sessionId);
      setLocations(locationPoints);
      
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fit map to show the entire route
  useEffect(() => {
    if (mapRef.current && locations.length > 0) {
      const coords = locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));
      
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [locations]);
  
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
          coordinates={[
            { latitude: point.latitude, longitude: point.longitude },
            { latitude: nextPoint.latitude, longitude: nextPoint.longitude }
          ]}
          strokeWidth={5}
          strokeColor={color}
        />
      );
    });
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading jogging data...</Text>
      </View>
    );
  }
  
  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Session Info */}
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionDate}>
          {session.startTime.toLocaleDateString()} - {session.startTime.toLocaleTimeString()}
        </Text>
      </View>
      
      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDistance(session.totalDistance || 0)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(session.duration || 0)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatSpeed(session.averageSpeed || 0)} km/h</Text>
            <Text style={styles.statLabel}>Average Speed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatSpeed(session.maxSpeed || 0)} km/h</Text>
            <Text style={styles.statLabel}>Max Speed</Text>
          </View>
        </View>
      </View>
      
      {/* Map */}
      <Text style={styles.sectionTitle}>Route Map</Text>
      <View style={styles.mapContainer}>
        {locations.length > 0 ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: locations[0].latitude,
              longitude: locations[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            {renderRouteSegments()}
            
            {locations.length > 0 && (
              <Marker
                coordinate={{
                  latitude: locations[0].latitude,
                  longitude: locations[0].longitude,
                }}
                title="Start"
                pinColor="green"
              />
            )}
            
            {locations.length > 1 && (
              <Marker
                coordinate={{
                  latitude: locations[locations.length - 1].latitude,
                  longitude: locations[locations.length - 1].longitude,
                }}
                title="Finish"
                pinColor="red"
              />
            )}
          </MapView>
        ) : (
          <View style={styles.noMapContainer}>
            <Text style={styles.noMapText}>No route data available</Text>
          </View>
        )}
      </View>
      
      {/* Speed Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Speed Legend</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3498db' }]} />
            <Text style={styles.legendText}>Walking</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2ecc71' }]} />
            <Text style={styles.legendText}>Light Jog</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#f1c40f' }]} />
            <Text style={styles.legendText}>Jogging</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#e67e22' }]} />
            <Text style={styles.legendText}>Fast Jog</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
            <Text style={styles.legendText}>Running</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  sessionInfo: {
    marginBottom: 16,
  },
  sessionDate: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  mapContainer: {
    height: 300,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  noMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e5e5',
  },
  noMapText: {
    fontSize: 16,
    color: '#666',
  },
  legendContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  legendColor: {
    width: 20,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
});

export default JoggingDetailScreen;
