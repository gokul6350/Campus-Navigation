import { View, Text, StyleSheet, ScrollView, Image, Dimensions, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import { useState, useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';

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
  screenWidth: number;
  screenHeight: number;
  platform: string;
  osVersion: string;
}

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Debug Map</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; background: #f0f0f0; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Initialize map with a default center
        const map = L.map('map').setView([0, 0], 2);
        
        // Add the tile layer immediately
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Create marker but don't add it yet
        let marker = null;

        // Update or create marker
        window.updateLocation = function(lat, lng) {
            if (marker === null) {
                marker = L.marker([lat, lng]).addTo(map);
            } else {
                marker.setLatLng([lat, lng]);
            }
            map.setView([lat, lng], 16);
            // Force a refresh of the map
            map.invalidateSize();
            return true;
        };

        // Force a map refresh after load
        setTimeout(function() {
            map.invalidateSize();
        }, 100);
    </script>
</body>
</html>
`;

export default function DebugPage() {
  const webViewRef = useRef(null);
  const window = Dimensions.get('window');
  
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    location: null,
    locationPermission: null,
    timestamp: new Date().toISOString(),
    imageBase64: null,
    screenWidth: window.width,
    screenHeight: window.height,
    platform: Platform.OS,
    osVersion: Platform.Version.toString(),
  });

  useEffect(() => {
    const loadImageBase64 = async () => {
      try {
        // Update the asset path to logo.jpg
        const asset = Asset.fromModule(require('../assets/images/logo.jpg'));
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

        // Update map location
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(
            `updateLocation(${location.coords.latitude}, ${location.coords.longitude});true;`
          );
        }
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
          <Text style={styles.sectionTitle}>Device Information</Text>
          <Text style={styles.debugText}>
            Platform: {deviceInfo.platform}
          </Text>
          <Text style={styles.debugText}>
            OS Version: {deviceInfo.osVersion}
          </Text>
          <Text style={styles.debugText}>
            Screen Resolution: {deviceInfo.screenWidth} x {deviceInfo.screenHeight}
          </Text>
        </View>

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
          <Text style={styles.sectionTitle}>Location Map</Text>
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: MAP_HTML }}
              style={styles.map}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
              originWhitelist={['*']}
              domStorageEnabled={true}
              javaScriptEnabled={true}
              onLoadEnd={() => {
                // If we already have location data, update the map
                if (deviceInfo.location) {
                  webViewRef.current?.injectJavaScript(
                    `updateLocation(${deviceInfo.location.latitude}, ${deviceInfo.location.longitude});true;`
                  );
                }
              }}
            />
          </View>
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
  mapContainer: {
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
}); 