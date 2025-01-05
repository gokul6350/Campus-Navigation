import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack } from 'expo-router';
import SearchableDropdown from 'react-native-searchable-dropdown';
import { locations, displayNames } from './config/locations';

const MAPTILER_KEY = 'lBY1eqoEm6WobvamqmwD';

export default function Map3D() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const webViewRef = React.useRef(null);
  const [isRotating, setIsRotating] = useState(false);

  const locationItems = Object.keys(locations).map((key) => ({
    id: key,
    name: displayNames[key],
  }));

  const handleLocationSelect = (item: { id: string; name: string }) => {
    setSelectedLocation(item.id);
    setIsRotating(true);
    const location = locations[item.id as keyof typeof locations];
    
    const jsCode = `
      (function() {
        // Cancel any ongoing animations
        if (window.rotationFrame) {
          cancelAnimationFrame(window.rotationFrame);
          window.rotationFrame = null;
        }

        // Reset the map view first
        map.stop();

        // Remove existing marker and popup if any
        if (window.currentMarker) {
          window.currentMarker.remove();
        }
        if (window.currentPopup) {
          window.currentPopup.remove();
        }

        // Create popup with location name
        window.currentPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -10],
          className: 'location-popup'
        })
          .setLngLat([${location[1]}, ${location[0]}])
          .setHTML('<div class="popup-content">${item.name}</div>')
          .addTo(map);

        // Add new marker
        window.currentMarker = new maplibregl.Marker({
          color: '#0000ff',
          scale: 1.2
        })
          .setLngLat([${location[1]}, ${location[0]}])
          .addTo(map);

        const centerPoint = [${location[1]}, ${location[0]}];

        // Fly to location
        map.flyTo({
          center: centerPoint,
          zoom: 18,
          pitch: 60,
          bearing: -30,
          duration: 2000,
          essential: true // This makes the animation a priority
        });

        // Modify the rotation code to check for a global stop flag
        setTimeout(() => {
          let bearing = -30;
 
          window.shouldStopRotation = false; // Reset stop flag
          
          const rotate = () => {
            if (window.shouldStopRotation) {
              window.rotationFrame = null;
              return;
            }

            bearing = (bearing + 0.5) % 360;
            
            map.jumpTo({
              center: centerPoint,
              bearing: bearing
            });
            
            if (bearing !== -30) {
              window.rotationFrame = requestAnimationFrame(rotate);
            } else {
              map.jumpTo({
                center: centerPoint,
                bearing: -30
              });
              window.rotationFrame = null;
              window.shouldStopRotation = true;
              true; // Return true to indicate rotation completed
            }
          };
          
          rotate();
        }, 2500);
      })();
    `;
    
    webViewRef.current?.injectJavaScript(jsCode);
  };

  const stopRotation = () => {
    const jsCode = `
      window.shouldStopRotation = true;
      if (window.rotationFrame) {
        cancelAnimationFrame(window.rotationFrame);
        window.rotationFrame = null;
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(jsCode);
    setIsRotating(false);
  };

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>3D Campus Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        .maplibregl-ctrl-attrib-inner { display: flex; }
        
        /* Custom marker pulse animation */
        .marker-pulse {
          width: 20px;
          height: 20px;
          background: rgba(255, 0, 0, 0.6);
          border-radius: 50%;
          position: relative;
        }
        
        .marker-pulse::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: red;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .location-popup {
          text-align: center;
        }

        .location-popup .maplibregl-popup-content {
          background: #1a237e;
          color: white;
          border-radius: 20px;
          padding: 8px 16px;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .location-popup .maplibregl-popup-tip {
          border-top-color: #1a237e;
        }

        .popup-content {
          font-size: 14px;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let currentMarker = null;
        let currentPopup = null;
        let rotationFrame = null;

        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}',
          center: [80.2234, 12.8741],
          zoom: 16,
          pitch: 60,
          bearing: -30,
          attributionControl: true,
          maxBounds: [
            [80.21333939608719, 12.864758610349512],
            [80.22775364730131, 12.882300720316172]
          ],
          renderWorldCopies: false
        });

        // Add this event listener
        map.on('moveend', () => {
          if (window.currentMarker) {
            window.currentMarker.addTo(map);
          }
          if (window.currentPopup) {
            window.currentPopup.addTo(map);
          }
        });

        // Clean up rotation animation when map is removed
        map.on('remove', () => {
          if (rotationFrame) {
            cancelAnimationFrame(rotationFrame);
          }
        });

        // Add 3D building layer when style is loaded
        map.on('style.load', () => {
          // Add 3D building layer if it doesn't exist
          if (!map.getLayer('3d-buildings')) {
            map.addLayer({
              'id': '3d-buildings',
              'source': 'composite',
              'source-layer': 'building',
              'filter': ['==', 'extrude', 'true'],
              'type': 'fill-extrusion',
              'minzoom': 15,
              'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15, 0,
                  15.05, ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15, 0,
                  15.05, ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
              }
            });
          }
        });

        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl());

        // Add scale control
        map.addControl(new maplibregl.ScaleControl({
          maxWidth: 80,
          unit: 'metric'
        }));
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '3D Campus View',
          headerStyle: {
            backgroundColor: '#1a237e',
          },
          headerTintColor: '#fff',
        }}
      />
      
      <View style={styles.searchContainer}>
        <SearchableDropdown
          onItemSelect={handleLocationSelect}
          items={locationItems}
          defaultIndex={0}
          resetValue={false}
          textInputProps={{
            placeholder: "Search location...",
            underlineColorAndroid: "transparent",
            style: styles.searchInput,
          }}
          itemStyle={styles.dropdownItem}
          itemTextStyle={styles.dropdownItemText}
          itemsContainerStyle={styles.dropdownItemsContainer}
        />
      </View>

      {isRotating && (
        <TouchableOpacity 
          style={styles.stopButton} 
          onPress={stopRotation}
        >
          <Text style={styles.stopButtonText}>Stop Rotation</Text>
        </TouchableOpacity>
      )}

      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: mapHTML }}
        javaScriptEnabled={true}
        onError={(syntheticEvent) => {
          console.warn('WebView error:', syntheticEvent.nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  searchInput: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 10,
    marginTop: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemsContainer: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  stopButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#1a237e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
