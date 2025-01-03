import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

const locations = [
  { id: '1', name: 'Nainital, Uttarakhand' },
  { id: '2', name: 'Gandhinagar, Gujarat' },
  // Add more locations as needed
];

export default function LocationSelectionScreen({ navigation, route }) {
  const { setLocation } = route.params;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setLocation(item.name);
              navigation.goBack();
            }}
          >
            <Text style={{ padding: 10, fontSize: 18 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
