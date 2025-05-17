
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingService } from '../services/JoggingService';
import { JoggingSession } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/locationUtils';
import { useNavigation, useIsFocused } from '@react-navigation/native';

const HomeScreen: React.FC = () => {
  const { db, isLoading: dbLoading } = useDatabase();
  const [sessions, setSessions] = useState<JoggingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  useEffect(() => {
    if (db && isFocused) {
      loadSessions();
    }
  }, [db, isFocused]);
  
  const loadSessions = async () => {
    if (!db) return;
    
    try {
      setLoading(true);
      const joggingService = new JoggingService(db);
      const sessionsData = await joggingService.getSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading jogging sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const startJogging = () => {
    navigation.navigate('Jogging' as never);
  };
  
  const viewHistory = () => {
    navigation.navigate('History' as never);
  };
  
  const renderSessionItem = ({ item }: { item: JoggingSession }) => {
    return (
      <TouchableOpacity 
        style={styles.sessionCard}
        onPress={() => navigation.navigate('JoggingDetail' as never, { sessionId: item.id } as never)}
      >
        <Text style={styles.sessionDate}>
          {item.startTime.toLocaleDateString()} - {item.startTime.toLocaleTimeString()}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(item.totalDistance || 0)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(item.duration || 0)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatSpeed(item.averageSpeed || 0)} km/h</Text>
            <Text style={styles.statLabel}>Avg Speed</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  if (dbLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Jogging Tracker</Text>
        <Text style={styles.subtitle}>Track your runs and analyze your progress</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.startButton} onPress={startJogging}>
          <Text style={styles.buttonText}>Start Jogging</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.historyButton} onPress={viewHistory}>
          <Text style={styles.historyButtonText}>View History</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Recent Jogs</Text>
        
        {loading ? (
          <ActivityIndicator style={styles.loading} size="small" color="#0066cc" />
        ) : sessions.length > 0 ? (
          <FlatList
            data={sessions.slice(0, 3)}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <Text style={styles.noDataText}>No jogging sessions recorded yet</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centeredContainer: {
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
  headerContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  historyButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  historyButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '500',
  },
  recentContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  loading: {
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  sessionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});

export default HomeScreen;
