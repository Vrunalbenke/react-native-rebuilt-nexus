
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import JoggingScreen from './src/screens/JoggingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import JoggingDetailScreen from './src/screens/JoggingDetailScreen';
import { StatusBar } from 'react-native';
import { DatabaseProvider } from './src/contexts/DatabaseContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <DatabaseProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Jogging Tracker' }} 
          />
          <Stack.Screen 
            name="Jogging" 
            component={JoggingScreen} 
            options={{ title: 'Track Jogging', headerShown: false }} 
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ title: 'Jogging History' }} 
          />
          <Stack.Screen 
            name="JoggingDetail" 
            component={JoggingDetailScreen} 
            options={{ title: 'Jogging Details' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </DatabaseProvider>
  );
}
