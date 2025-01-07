import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack } from 'expo-router';
import SearchableDropdown from 'react-native-searchable-dropdown';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { locations, displayNames } from './config/locations';

export default function ExploreMap() {
  const navigation = useNavigation();
  const [source, setSource] = useState<string>('Block2');
  const [destination, setDestination] = useState<string>('CentreForAdvancedStudies');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState(null); // 'source' or 'destination'
  const webViewRef = useRef(null);
  const [isWithinBounds, setIsWithinBounds] = useState(false);

  const handleCurrentLocationSelect = useCallback(() => {
    if (!webViewRef.current) return;

    const resetScript = `
      (function() {
        // Clear all existing routes and markers
        if (map) {
          // Remove all layers except the base tile layer
          map.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer)) {
              map.removeLayer(layer);
            }
          });

          // Reset all tracking variables
          currentRoute = null;
          currentLocationMarker = null;
          sourceMarker = null;
          destinationMarker = null;
          allRoutes = [];

          // Center map on campus
          map.setView([12.8741, 80.2234], 17);
        }
        return true;
      })();
    `;

    webViewRef.current.injectJavaScript(resetScript);
  }, []);

  const isPointWithinBounds = (lat: number, lng: number) => {
    const bounds = [
      [12.882300720316172, 80.21333939608719], // North East
      [12.864758610349512, 80.22775364730131]  // South West
    ];
    
    return lat <= bounds[0][0] && lat >= bounds[1][0] &&
           lng >= bounds[0][1] && lng <= bounds[1][1];
  };

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      alert('Location permission is required to use current location');
      return;
    }

    try {
      // Reset routes before getting new location
      handleCurrentLocationSelect();

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
    const coords = [currentLocation.coords.latitude, currentLocation.coords.longitude];
    setCurrentLocation(coords);
    
    const withinBounds = isPointWithinBounds(coords[0], coords[1]);
    setIsWithinBounds(withinBounds);
    
    if (withinBounds) {
      setSource('CurrentLocation');
        // Route will be updated by the useEffect watching source
    } else {
      alert('You are currently outside the campus boundaries');
        setSource('Block2');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Failed to get current location. Please try again.');
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setCurrentLocation([currentLocation.coords.latitude, currentLocation.coords.longitude]);
    })();
  }, []);

  useEffect(() => {
    if (source && destination) {
      console.log('React component - Source:', source, 'Destination:', destination);
    }
  }, [source, destination]);

  useEffect(() => {
    console.log('WebView component mounted/reset');
  }, []);

  const updateRoute = useCallback(() => {
    if (!webViewRef.current || !source || !destination) return;
    
    const jsCode = `
      (function() {
        // Reset everything first
        if (map) {
          // Remove all layers from the map
          map.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer)) {
              map.removeLayer(layer);
            }
          });
          
          // Reset variables
          currentRoute = null;
          currentLocationMarker = null;
          sourceMarker = null;
          destinationMarker = null;
          allRoutes = [];
        }

        try {
        // Add the decode polyline function
        function decodePolyline(str) {
          var index = 0,
              lat = 0,
              lng = 0,
              coordinates = [],
              shift = 0,
              result = 0,
              byte = null,
              latitude_change,
              longitude_change;

          // Coordinates have variable length when encoded, so just keep
          // track of whether we've hit the end of the string. In each
          // loop iteration, a single coordinate is decoded.
          while (index < str.length) {
            // Reset shift, result, and byte
            byte = null;
            shift = 0;
            result = 0;

            do {
              byte = str.charCodeAt(index++) - 63;
              result |= (byte & 0x1f) << shift;
              shift += 5;
            } while (byte >= 0x20);

            latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

            shift = result = 0;

            do {
              byte = str.charCodeAt(index++) - 63;
              result |= (byte & 0x1f) << shift;
              shift += 5;
            } while (byte >= 0x20);

            longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

            lat += latitude_change;
            lng += longitude_change;

            coordinates.push([lat / 100000.0, lng / 100000.0]);
          }

          return coordinates;
        }
          
          const sourceCoords = '${source}' === 'CurrentLocation' ? 
            ${JSON.stringify(currentLocation)} : 
            ${JSON.stringify(locations[source])};
          const destCoords = ${JSON.stringify(locations[destination])};

          // Add new markers
          if (sourceCoords) {
            sourceMarker = L.marker(sourceCoords, {
              icon: createCustomMarker('source-marker')
            }).addTo(map);
          }

          if (destCoords) {
            destinationMarker = L.marker(destCoords, {
              icon: createCustomMarker('destination-marker')
            }).addTo(map);
          }

          // Add current location marker if within bounds
          ${isWithinBounds && currentLocation ? `
            currentLocationMarker = L.marker([${currentLocation[0]}, ${currentLocation[1]}], {
              icon: createCustomMarker('current-location-marker')
            }).addTo(map);
          ` : ''}

          // Create new route
          const sourceStr = \`\${sourceCoords[0]}%2C\${sourceCoords[1]}\`;
          const destStr = \`\${destCoords[0]}%2C\${destCoords[1]}\`;

          fetch(\`https://api.olamaps.io/routing/v1/directions?origin=\${sourceStr}&destination=\${destStr}&mode=walking&alternatives=false&steps=true&overview=full&language=en&traffic_metadata=false&api_key=JSldpyI1lvyHaDcM461nEj60xKbxRR39ObU8R3Gy\`, {
            method: 'POST',
            headers: { 'accept': 'application/json' },
            body: ''
          })
          .then(response => {
            if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
            return response.json();
          })
          .then(data => {
            if (data.status === 'SUCCESS') {
              const coordinates = decodePolyline(data.routes[0].overview_polyline);
              currentRoute = L.polyline(coordinates, {
                color: '#0066CC',
                opacity: 0.8,
                weight: 6
              }).addTo(map);

              map.fitBounds(currentRoute.getBounds(), {
                padding: [50, 50]
              });
            } else {
              throw new Error('Route calculation failed');
            }
          })
          .catch(error => {
            console.error('Route error:', error.message);
          });

          return true;
        } catch (error) {
          console.error('Error:', error.message);
          return false;
        }
      })();
    `;

    webViewRef.current.injectJavaScript(jsCode);
  }, [source, destination, currentLocation, isWithinBounds]);

  useEffect(() => {
    console.log('Source or destination changed:', { source, destination });
    updateRoute();
  }, [source, destination, updateRoute]);

  const mapHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
        <style>
          body, html, #map {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          .current-location-marker {
            position: relative;
            width: 24px;
            height: 24px;
            background-color: transparent;
          }

          .current-location-marker::before {
            content: '';
            position: absolute;
            width: 24px;
            height: 24px;
            background-color: #4285F4;
            border-radius: 50%;
            opacity: 0.2;
          }

          .current-location-marker::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 12px;
            height: 12px;
            background-color: white;
            border: 3px solid #4285F4;
            border-radius: 50%;
            box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
          }

          .source-marker {
            background-color: #4285F4;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            width: 16px;
            height: 16px;
          }

          .destination-marker {
            position: relative;
            width: 24px;
            height: 24px;
            background-color: #4285F4;
            border-radius: 50% 50% 0 50%;
            transform: rotate(45deg);
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            border: 3px solid white;
          }

          .destination-marker::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          }
        </style>
        
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let currentRoute = null;
          let currentLocationMarker = null;
          let sourceMarker = null;
          let destinationMarker = null;
          let allRoutes = []; // Array to track all routes

          // Function to clear all routes and markers
          function clearAllRoutesAndMarkers() {
            // Clear routes
            if (allRoutes.length > 0) {
              allRoutes.forEach(route => {
                if (route) {
                  map.removeLayer(route);
                }
              });
              allRoutes = [];
            }
            
            // Clear markers
            if (currentLocationMarker) {
              map.removeLayer(currentLocationMarker);
              currentLocationMarker = null;
            }
            if (sourceMarker) {
              map.removeLayer(sourceMarker);
              sourceMarker = null;
            }
            if (destinationMarker) {
              map.removeLayer(destinationMarker);
              destinationMarker = null;
            }
          }

          async function sendToDiscord(message) {
            try {
              await fetch('https://discord.com/api/webhooks/1314561479806287892/2yqjQlAe1GIDwglKh9f5v3JnrRVL0VXa3g0Mof5LpGkHGvESZux6wUndisgxvOanrsfm', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: \`Debug Log: \${message}\`
                })
              });
            } catch (error) {
              console.error('Failed to send to Discord:', error);
            }
          }

          function showDebug(message) {
            sendToDiscord(message);
    
            }

          showDebug('Map initialization started');
          
          map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            minZoom: 15,
            maxZoom: 19,
            maxBounds: [
              [12.882300720316172, 80.21333939608719],
              [12.864758610349512, 80.22775364730131]
            ],
            maxBoundsViscosity: 1.0
          }).setView([12.8741, 80.2234], 17);

          // Add zoom end event listener to check and reset zoom
          map.on('zoomend', function() {
            const currentZoom = map.getZoom();
            if (currentZoom > 19 || map.getContainer().innerHTML === '') {
              // If zoom is too high or map is blank, reset to safe zoom level
              map.setZoom(17);
              showDebug('Map zoom reset to safe level');
            }
          });

          // Add error event listener
          map.on('error', function(e) {
            showDebug('Map error occurred: ' + e.message);
            // Reset the map view
            map.setView([12.8741, 80.2234], 17);
          });

          var OPNVKarte = L.tileLayer('https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png', {
            maxZoom: 19,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' // Transparent pixel for missing tiles
          }).addTo(map);

          // Add tile error handling
          OPNVKarte.on('tileerror', function(e) {
            showDebug('Tile loading error, resetting zoom');
            map.setZoom(17);
          });

          window.map = map;
          showDebug('Map created with error handlers');

          function updateCurrentLocationMarker(coords) {
            if (currentLocationMarker) {
              map.removeLayer(currentLocationMarker);
            }
            
            const markerElement = document.createElement('div');
            markerElement.className = 'current-location-marker';
            
            currentLocationMarker = L.marker(coords, {
              icon: L.divIcon({
                className: 'current-location-marker-wrapper',
                html: markerElement,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              })
            }).addTo(map);
          }

          function createCustomMarker(className) {
            const markerElement = document.createElement('div');
            markerElement.className = className;
            return L.divIcon({
              className: className + '-wrapper',
              html: markerElement,
              iconSize: className === 'current-location-marker' ? [24, 24] : [16, 16],
              iconAnchor: className === 'current-location-marker' ? [12, 12] : [8, 8]
            });
          }

          function updateSourceDestinationMarkers(sourceCoords, destCoords) {
            clearAllRoutesAndMarkers(); // Clear everything before adding new markers

            // Add source marker (if not current location)
            if (sourceCoords) {
              sourceMarker = L.marker(sourceCoords, {
                icon: createCustomMarker('source-marker')
              }).addTo(map);
            }

            // Add destination marker
            if (destCoords) {
              destinationMarker = L.marker(destCoords, {
                icon: createCustomMarker('destination-marker')
              }).addTo(map);
            }
          }
        </script>
      </body>
    </html>
  `;

  const locationItems = [
    { id: 'CurrentLocation', name: 'Current Location' },
    ...Object.keys(locations).map((key) => ({
    id: key,
    name: displayNames[key],
    }))
  ];

  const openSearchModal = (type) => {
    setActiveSearchType(type);
    setIsSearchModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Campus Map',
          headerStyle: {
            backgroundColor: '#1a237e',
          },
          headerTintColor: '#fff',
        }} 
      />
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: mapHTML }}
        javaScriptEnabled={true}
        onError={(syntheticEvent) => {
          console.log('WebView error:', syntheticEvent.nativeEvent);
        }}
        onLoadEnd={() => {
          console.log('WebView loaded');
        }}
      />
      <Image source={require('../assets/images/pure_logo.png')} style={styles.logo} />
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={() => openSearchModal('source')}
        >
          <Text style={styles.searchButtonText}>
            {source ? displayNames[source] : 'Select Source'}
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={() => openSearchModal('destination')}
        >
          <Text style={styles.searchButtonText}>
            {destination ? displayNames[destination] : 'Select Destination'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isSearchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {activeSearchType === 'source' ? 'Source' : 'Destination'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsSearchModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <SearchableDropdown
              onItemSelect={(item) => {
                  if (item.id === 'CurrentLocation') {
                    getCurrentLocation();
                  } else {
                    setSource(item.id);
                }
                setIsSearchModalVisible(false);
              }}
              items={locationItems}
              defaultIndex={0}
              resetValue={false}
              textInputProps={{
                placeholder: `Search location...`,
                underlineColorAndroid: "transparent",
                style: styles.searchInput,
              }}
              itemStyle={styles.dropdownItem}
              itemTextStyle={styles.dropdownItemText}
              itemsContainerStyle={styles.dropdownItemsContainer}
              listProps={{
                nestedScrollEnabled: true,
              }}
            />
          </View>
        </View>
      </Modal>
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
  logo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 30,
    height: 30,
    zIndex: 1000,
  },
  card: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  searchButton: {
    padding: 15,
  },
  searchButtonText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#666',
  },
  searchInput: {
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    fontSize: 16,
  },
  dropdownItem: {
    padding: 15,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemsContainer: {
    maxHeight: '70%',
  },
}); 