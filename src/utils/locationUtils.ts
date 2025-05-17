
import { LocationPoint } from '../types';

// Calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate total distance of a route in meters
export function calculateTotalDistance(locations: LocationPoint[]): number {
  if (locations.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1];
    const current = locations[i];
    
    totalDistance += calculateDistance(
      prev.latitude,
      prev.longitude,
      current.latitude,
      current.longitude
    );
  }
  
  return totalDistance;
}

// Calculate average speed from points in meters per second
export function calculateAverageSpeed(locations: LocationPoint[]): number {
  if (locations.length < 2) return 0;
  
  const speedPoints = locations.filter(point => point.speed !== undefined && point.speed !== null);
  if (speedPoints.length === 0) return 0;
  
  const totalSpeed = speedPoints.reduce((sum, point) => sum + (point.speed || 0), 0);
  return totalSpeed / speedPoints.length;
}

// Calculate max speed from points in meters per second
export function calculateMaxSpeed(locations: LocationPoint[]): number {
  if (locations.length === 0) return 0;
  
  const speedPoints = locations.filter(point => point.speed !== undefined && point.speed !== null);
  if (speedPoints.length === 0) return 0;
  
  return Math.max(...speedPoints.map(point => point.speed || 0));
}

// Format meters to kilometers (with two decimal places)
export function formatDistance(meters: number): string {
  const kilometers = meters / 1000;
  return kilometers.toFixed(2);
}

// Format seconds to MM:SS or HH:MM:SS format
export function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format speed from m/s to km/h (with one decimal place)
export function formatSpeed(metersPerSecond: number): string {
  const kmPerHour = metersPerSecond * 3.6; // Convert m/s to km/h
  return kmPerHour.toFixed(1);
}

// Determine activity type based on speed (rough estimate)
export function getActivityType(speed: number): 'walking' | 'jogging' | 'running' {
  if (speed < 1.5) return 'walking'; // Less than 5.4 km/h
  if (speed < 3) return 'jogging'; // Less than 10.8 km/h
  return 'running'; // 10.8+ km/h
}

// Get a color based on speed intensity
export function getSpeedColor(speed: number): string {
  if (speed < 1.0) return '#3498db'; // Walking - blue
  if (speed < 2.0) return '#2ecc71'; // Light jogging - green
  if (speed < 3.0) return '#f1c40f'; // Jogging - yellow
  if (speed < 4.0) return '#e67e22'; // Fast jogging - orange
  return '#e74c3c'; // Running - red
}
