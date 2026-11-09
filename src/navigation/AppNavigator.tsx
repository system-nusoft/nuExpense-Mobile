import React from 'react';
import {createBottomTabNavigator, BottomTabBar} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import DashboardScreen from '../screens/app/DashboardScreen';
import ExpensesScreen from '../screens/app/ExpensesScreen';
import ScanScreen from '../screens/app/ScanScreen';
import CategoriesScreen from '../screens/app/CategoriesScreen';
import SettingsScreen from '../screens/app/SettingsScreen';
import AdBanner from '../components/common/AdBanner';

// Ads only appear on these tabs - never in the scan flow or category editing.
const AD_TABS = ['Dashboard', 'Expenses'];

export type AppTabParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Scan: undefined;
  Categories: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function TabIcon({name, focused}: {name: string; focused: boolean}) {
  const icons: Record<string, string> = {
    Dashboard: '◫',
    Expenses: '₿',
    Scan: '⊡',
    Categories: '⊞',
  };
  return (
    <Text style={{fontSize: 20, color: focused ? '#3e6378' : '#9CA3AF'}}>
      {icons[name] ?? '●'}
    </Text>
  );
}

function TabsScreen() {
  const {t} = useTranslation();
  return (
    <Tab.Navigator
      tabBar={props => (
        <View>
          {AD_TABS.includes(props.state.routes[props.state.index].name) && <AdBanner />}
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3e6378',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
        tabBarIcon: ({focused}) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{tabBarLabel: t('nav.dashboard')}} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} options={{tabBarLabel: t('nav.expenses')}} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{tabBarLabel: t('nav.scan')}} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{tabBarLabel: t('nav.categories')}} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Tabs" component={TabsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
