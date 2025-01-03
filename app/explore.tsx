import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack } from 'expo-router';
import SearchableDropdown from 'react-native-searchable-dropdown';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

export default function ExploreMap() {
  const navigation = useNavigation();
  const [source, setSource] = useState('Block2');
  const [destination, setDestination] = useState('CentreForAdvancedStudies');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState(null); // 'source' or 'destination'
  const webViewRef = useRef(null);

  const locations = {
    Library: [12.873582943873872, 80.21921784197703],
    Canteen: [12.872502, 80.219496],
    AdminBlock: [12.873147339012304, 80.22180918077176],
    Block1: [12.87388781717391, 80.2214368051665],
    Block2: [12.87279953771407, 80.2208933391326],
    CentreForAdvancedStudies: [12.871388230107986, 80.22526689609808],
  };

  const displayNames = {
    Library: 'Library',
    Canteen: 'Canteen',
    AdminBlock: 'Admin Block',
    Block1: 'Block 1',
    Block2: 'Block 2',
    CentreForAdvancedStudies: 'Centre for Advanced Studies',
    CurrentLocation: 'Current Location',
  };

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    setCurrentLocation([currentLocation.coords.latitude, currentLocation.coords.longitude]);
    setSource('CurrentLocation');
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
    
    console.log('Updating route:', { source, destination }); // IDE log

    const jsCode = `
      (function() {
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

        showDebug('Updating route...');
        try {
          // Store the current map center and zoom before updating
          const currentCenter = map.getCenter();
          const currentZoom = map.getZoom();

          const sourceCoords = '${source}' === 'CurrentLocation' ? 
            ${JSON.stringify(currentLocation)} : 
            ${JSON.stringify(locations[source])};
          const destCoords = ${JSON.stringify(locations[destination])};

          showDebug('Coordinates - Source: ' + JSON.stringify(sourceCoords) + ', Dest: ' + JSON.stringify(destCoords));

          // Clear existing route if any
          if (window.currentRoute) {
            map.removeControl(window.currentRoute);
            window.currentRoute = null;
          }

          // Create new route using Ola Maps API
          const sourceStr = \`\${sourceCoords[0]}%2C\${sourceCoords[1]}\`;
          const destStr = \`\${destCoords[0]}%2C\${destCoords[1]}\`;

          sendToDiscord(\`Making request with: \${sourceStr} to \${destStr}\`);

          fetch(\`https://api.olamaps.io/routing/v1/directions?origin=\${sourceStr}&destination=\${destStr}&mode=walking&alternatives=false&steps=true&overview=full&language=en&traffic_metadata=false&api_key=JSldpyI1lvyHaDcM461nEj60xKbxRR39ObU8R3Gy\`, {
            method: 'POST',
            headers: {
              'accept': 'application/json'
            },
            body: ''
          })
          .then(response => {
            sendToDiscord(\`Response status: \${response.status}, \${response.statusText}\`);
            if (!response.ok) {
              throw new Error(\`HTTP error! status: \${response.status}\`);
            }
            return response.json();
          })
          .then(data => {
            // Send full API response to Discord
            sendToDiscord(\`Ola Maps API Response: \${JSON.stringify(data, null, 2)}\`);

            if (data.status === 'SUCCESS') {
              const route = data.routes[0];
              // Send route-specific data to Discord
              sendToDiscord(\`Route being used: \${JSON.stringify(route, null, 2)}\`);
              
              const coordinates = decodePolyline(route.overview_polyline);
              
              window.currentRoute = L.polyline(coordinates, {
                color: '#0066CC',
                opacity: 0.8,
                weight: 6
              }).addTo(map);

              map.fitBounds(window.currentRoute.getBounds());
              map.setView(currentCenter, currentZoom);
              
              showDebug('Walking route added');
            } else {
              sendToDiscord(\`Route calculation failed: \${JSON.stringify(data, null, 2)}\`);
              throw new Error('Route calculation failed');
            }
          })
          .catch(error => {
            sendToDiscord(\`Error in route calculation: \${error.toString()} - \${error.message}\`);
            showDebug('Error updating route: ' + error.message);
          });

          true;
        } catch (error) {
          showDebug('Error updating route: ' + error.message);
          console.error(error);
          false;
        }
      })();
    `;

    webViewRef.current.injectJavaScript(jsCode);
  }, [source, destination, currentLocation, locations]);

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
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let currentRoute;

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

          var OPNVKarte = L.tileLayer('https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          window.map = map;
          showDebug('Map created');
        </script>
      </body>
    </html>
  `;

  const locationItems = Object.keys(locations).map((key) => ({
    id: key,
    name: displayNames[key],
  }));

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
                if (activeSearchType === 'source') {
                  if (item.id === 'CurrentLocation') {
                    getCurrentLocation();
                  } else {
                    setSource(item.id);
                  }
                } else {
                  setDestination(item.id);
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