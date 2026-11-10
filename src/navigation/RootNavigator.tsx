import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuth} from '../contexts/AuthContext';
import {ActivityIndicator, View} from 'react-native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import BrandWordmark, {BRAND_NAVY} from '../components/common/BrandWordmark';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'}}>
        <BrandWordmark size="lg" style={{marginBottom: 24}} />
        <ActivityIndicator size="large" color={BRAND_NAVY} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {user ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
