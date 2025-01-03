import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import { TILES_CONFIG } from './config/tiles';

const SATHYABAMA_REGION = {
  latitude: 12.8741,
  longitude: 80.2234,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function OfflineMaps() {
  const [showCustomTiles, setShowCustomTiles] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(17);

  const handleRegionChange = (region: any) => {
    // Calculate zoom level from region delta
    const latDelta = region.latitudeDelta;
    const zoomLevel = Math.round(Math.log2(360 / latDelta));
    if (zoomLevel >= 16 && zoomLevel <= 19) {
      setCurrentZoom(zoomLevel);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Offline Maps',
          headerStyle: {
            backgroundColor: '#1a237e',
          },
          headerTintColor: '#fff',
        }} 
      />

      <MapView
        style={styles.map}
        initialRegion={SATHYABAMA_REGION}
        minZoomLevel={16}
        maxZoomLevel={19}
        onRegionChangeComplete={handleRegionChange}
        mapType="none" // Don't show Google's base map
      >
        {showCustomTiles && (
          <UrlTile 
            urlTemplate={`file:///assets/sathyabama_tiles/{z}/{x}/{y}.png`}
            maximumZ={19}
            minimumZ={16}
            flipY={false}
            tileSize={256}
          />
        )}
        <Marker
          coordinate={{
            latitude: SATHYABAMA_REGION.latitude,
            longitude: SATHYABAMA_REGION.longitude,
          }}
          title="Sathyabama University"
          description="Main Campus"
        />
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.layerToggle}
          onPress={() => setShowCustomTiles(!showCustomTiles)}
        >
          <Text style={styles.buttonText}>
            {showCustomTiles ? 'Hide Map' : 'Show Map'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.zoomText}>Zoom Level: {currentZoom}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  layerToggle: {
    backgroundColor: '#1a237e',
    padding: 10,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  zoomText: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 4,
    fontWeight: 'bold',
    color: '#1a237e',
  },
}); 