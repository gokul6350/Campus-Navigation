import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { useState, useEffect } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface DeviceInfo {
  location: LocationInfo | null;
  locationPermission: Location.PermissionStatus | null;
  timestamp: string;
  imageBase64: string | null;
}

export default function DebugPage() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    location: null,
    locationPermission: null,
    timestamp: new Date().toISOString(),
    imageBase64: null,
  });

  useEffect(() => {
    const loadImageBase64 = async () => {
      try {
        // Get the asset
        const asset = Asset.fromModule(require('../assets/images/icon.png'));
        // Wait for asset to load
        await asset.downloadAsync();
        
        if (asset.localUri) {
          // Read the file and convert to base64
          const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          setDeviceInfo(prev => ({
            ...prev,
            imageBase64: base64,
          }));
        }
      } catch (error) {
        console.error('Error loading image:', error);
      }
    };

    const getLocationData = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      let locationData: LocationInfo | null = null;
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || null,
        };
      }

      setDeviceInfo(prev => ({
        ...prev,
        location: locationData,
        locationPermission: status,
      }));
    };

    loadImageBase64();
    getLocationData();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Debug Mode',
          headerStyle: {
            backgroundColor: '#424242',
          },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Icon</Text>
          {deviceInfo.imageBase64 && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `data:image/png;base64,${deviceInfo.imageBase64}` }}
                style={styles.image}
                resizeMode="contain"
              />
              <Text style={styles.debugText}>
                Base64 Length: {deviceInfo.imageBase64.length} characters
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          <Text style={styles.debugText}>
            Permission Status: {deviceInfo.locationPermission}
          </Text>
          {deviceInfo.location && (
            <>
              <Text style={styles.debugText}>
                Latitude: {deviceInfo.location.latitude}
              </Text>
              <Text style={styles.debugText}>
                Longitude: {deviceInfo.location.longitude}
              </Text>
              <Text style={styles.debugText}>
                Accuracy: {deviceInfo.location.accuracy}m
              </Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <Text style={styles.debugText}>
            Last Updated: {deviceInfo.timestamp}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  debugText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginBottom: 5,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 10,
  },
}); 