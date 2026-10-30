import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, CalendarCheck, ListTodo, User } from 'lucide-react-native';
import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import TaskScreen from '../screens/TaskScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: 80,
          paddingBottom: 20,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          position: 'absolute',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let icon;
          if (route.name === 'Home') icon = LayoutDashboard;
          else if (route.name === 'Attendance') icon = CalendarCheck;
          else if (route.name === 'Tasks') icon = ListTodo;
          else if (route.name === 'Profile') icon = User;

          const IconComponent = icon;
          return (
            <IconComponent 
              size={24} 
              color={focused ? '#1e40af' : '#94a3b8'} 
              strokeWidth={focused ? 3 : 2}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Tasks" component={TaskScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
