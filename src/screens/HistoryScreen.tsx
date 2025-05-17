
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDatabase } from '../contexts/DatabaseContext';
import { JoggingService } from '../services/JoggingService';
import { JoggingSession } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/locationUtils';
import { useNavigation, useIsFocused } from '@react-navigation/native';

const HistoryScreen: React.FC = () => {
  const { db } = useDatabase();
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
      Alert.alert('Error', 'Failed to load jogging history');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteSession = async (sessionId: number) => {
    if (!db) return;
    
    try {
      const joggingService = new JoggingService(db);
      await joggingService.deleteSession(sessionId);
      
      // Refresh the list
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      Alert.alert('Error', 'Failed to delete jogging session');
    }
  };
  
  const confirmDelete = (sessionId: number) => {
    Alert.alert(
      'Delete Jogging Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSession(sessionId) }
      ]
    );
  };
  
  const renderSessionItem = ({ item }: { item: JoggingSession }) => {
    return (
      <TouchableOpacity 
        style={styles.sessionCard}
        onPress={() => navigation.navigate('JoggingDetail' as never, { sessionId: item.id } as never)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sessionDate}>
              {item.startTime.toLocaleDateString()} - {item.startTime.toLocaleTimeString()}
            </Text>
            <Text style={styles.sessionDuration}>
              {formatDuration(item.duration || 0)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmDelete(item.id)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(item.totalDistance || 0)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatSpeed(item.averageSpeed || 0)} km/h</Text>
            <Text style={styles.statLabel}>Avg Speed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatSpeed(item.maxSpeed || 0)} km/h</Text>
            <Text style={styles.statLabel}>Max Speed</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading jogging history...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Jogging History</Text>
      
      {sessions.length > 0 ? (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No jogging sessions recorded yet</Text>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => navigation.navigate('Jogging' as never)}
          >
            <Text style={styles.startButtonText}>Start Jogging</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 12,
    width: '60%',
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sessionDuration: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#e74c3c',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
});

export default HistoryScreen;
