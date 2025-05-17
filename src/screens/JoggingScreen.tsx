
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Platform,
  BackHandler
} from 'react-native';
import MapView, { Polyline, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingService } from '../services/JoggingService';
import { LocationPoint } from '../types';
import { 
  calculateTotalDistance, 
  calculateAverageSpeed, 
  calculateMaxSpeed, 
  formatDistance, 
  formatDuration,
  formatSpeed,
  getSpeedColor
} from '../utils/locationUtils';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_TRACKING_OPTIONS = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5, // minimum distance between points in meters
  timeInterval: 3000, // minimum time between location updates in ms
  foregroundService: {
    notificationTitle: "Jogging Tracker",
    notificationBody: "Tracking your jogging route",
  },
};

const JoggingScreen: React.FC = () => {
  const { db } = useDatabase();
  const navigation = useNavigation();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef(0);
  const lastPauseTimeRef = useRef<number | null>(null);
  
  // Request location permissions
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        setPermissionStatus('denied');
        setLoading(false);
        return;
      }
      
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        setPermissionStatus('limited');
      } else {
        setPermissionStatus('granted');
      }
      
      // Get initial position
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const initialLocation: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().getTime(),
          speed: location.coords.speed || 0,
        };
        
        setCurrentLocation(initialLocation);
      } catch (error) {
        console.log('Error getting initial location:', error);
      }
      
      setLoading(false);
    })();
  }, []);
  
  // Handle back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isTracking) {
          Alert.alert(
            'Session in Progress',
            'Do you want to stop tracking and save this jogging session?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => {} },
              { 
                text: 'Stop & Save', 
                style: 'destructive', 
                onPress: () => stopTracking() 
              }
            ]
          );
          return true;
        }
        return false;
      };
      
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [isTracking])
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Start tracking location and timer
  const startTracking = async () => {
    if (!db) {
      Alert.alert('Error', 'Database not initialized');
      return;
    }
    
    try {
      // Create a new session in the database
      const joggingService = new JoggingService(db);
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
      
      // Start location tracking
      locationSubscription.current = await Location.watchPositionAsync(
        LOCATION_TRACKING_OPTIONS,
        (location) => {
          const newLocation: LocationPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed !== null ? location.coords.speed : 0,
          };
          
          setCurrentLocation(newLocation);
          
          if (!isPaused) {
            setLocations(prev => [...prev, newLocation]);
            
            // Save location to database
            if (sessionId) {
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
            
            // Update map to follow location
            if (mapRef.current && newLocation) {
              mapRef.current.animateCamera({
                center: {
                  latitude: newLocation.latitude,
                  longitude: newLocation.longitude,
                },
                zoom: 16,
              });
            }
          }
        }
      );
      
      setIsTracking(true);
      setIsPaused(false);
      setLocations([]);
      
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking');
    }
  };
  
  // Toggle pause/resume tracking
  const togglePause = () => {
    if (isPaused) {
      // Resume tracking
      if (lastPauseTimeRef.current) {
        pausedTimeRef.current += (Date.now() - lastPauseTimeRef.current);
        lastPauseTimeRef.current = null;
      }
    } else {
      // Pause tracking
      lastPauseTimeRef.current = Date.now();
    }
    
    setIsPaused(!isPaused);
  };
  
  // Stop tracking and save session
  const stopTracking = async () => {
    if (!db || sessionId === null) {
      Alert.alert('Error', 'Session not properly initialized');
      return;
    }
    
    try {
      // Stop location tracking
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      
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
      const joggingService = new JoggingService(db);
      await joggingService.endSession(sessionId, {
        totalDistance,
        averageSpeed: avgSpeed,
        maxSpeed: maxSpd,
        duration: elapsedTime,
      });
      
      // Navigate back to home screen
      navigation.navigate('Home' as never);
      
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to save tracking data');
    } finally {
      setIsTracking(false);
      setIsPaused(false);
      setSessionId(null);
    }
  };
  
  // For rendering permission error
  if (permissionStatus === 'denied') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Location Permission Required</Text>
        <Text style={styles.permissionText}>
          This app needs location permission to track your jogging route.
          Please enable location permission in your device settings.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // For rendering loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Initializing location services...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton
        initialRegion={currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        } : undefined}
      >
        {locations.length > 1 && (
          <Polyline
            coordinates={locations.map(loc => ({
              latitude: loc.latitude,
              longitude: loc.longitude,
            }))}
            strokeWidth={5}
            strokeColor="#0066cc"
          />
        )}
        
        {currentLocation && (
          <Circle
            center={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            radius={8}
            fillColor="#0066cc"
            strokeWidth={2}
            strokeColor="#ffffff"
          />
        )}
      </MapView>
      
      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(distance)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(elapsedTime)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>
        
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatSpeed(currentSpeed)} km/h</Text>
            <Text style={styles.statLabel}>Current Speed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatSpeed(averageSpeed)} km/h</Text>
            <Text style={styles.statLabel}>Average Speed</Text>
          </View>
        </View>
      </View>
      
      {/* Control Panel */}
      <View style={styles.controlPanel}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.buttonText}>Start Tracking</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[
                styles.controlButton,
                isPaused ? styles.resumeButton : styles.pauseButton
              ]} 
              onPress={togglePause}
            >
              <Text style={styles.buttonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.stopButton} onPress={() => {
              Alert.alert(
                'End Session',
                'Do you want to stop and save this jogging session?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Stop & Save', onPress: stopTracking }
                ]
              );
            }}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (isTracking) {
              Alert.alert(
                'Session in Progress',
                'Do you want to stop tracking and save this jogging session?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Stop & Save', onPress: stopTracking }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
      
      {/* Limited permission warning */}
      {permissionStatus === 'limited' && (
        <View style={styles.permissionWarning}>
          <Text style={styles.warningText}>
            Limited background location access. Tracking may be interrupted when app is in background.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    width: '80%',
    alignItems: 'center',
  },
  permissionWarning: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 204, 0, 0.8)',
    padding: 8,
  },
  warningText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#333',
  },
  statsPanel: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  controlPanel: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    padding: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  controlButton: {
    borderRadius: 8,
    padding: 16,
    flex: 1,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#f39c12',
    marginRight: 8,
  },
  resumeButton: {
    backgroundColor: '#2ecc71',
    marginRight: 8,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
  },
});

export default JoggingScreen;
