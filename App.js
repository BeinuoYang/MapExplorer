import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import MapScreen from './screens/MapScreen';

export default function App() {
  const [permissionStatus, setPermissionStatus] = useState('loading');

  useEffect(() => {
    (async () => {
      console.log('[App] 请求位置权限...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[App] 位置权限状态:', status);
      setPermissionStatus(status);
    })();
  }, []);

  if (permissionStatus === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4fc3f7" />
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>需要位置权限才能使用地图探索功能</Text>
        <Text style={styles.hintText}>请在系统设置中开启位置权限后重启 App</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MapScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  hintText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
