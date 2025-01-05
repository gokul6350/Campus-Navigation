import { Text, View, TouchableOpacity, Image, StyleSheet, SafeAreaView } from 'react-native';
import { Link } from 'expo-router';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require("../assets/images/logo.jpg")}
          style={styles.logo}
        />
        <Text style={styles.title}>Sathyabama Navigation App</Text>
      </View>

      <View style={styles.navigationContainer}>
        <Link href="/explore" asChild>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navText}>Campus Navigation</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/3d-map" asChild>
          <TouchableOpacity style={styles.navButton}>
            <Text style={styles.navText}>3D Map</Text>
          </TouchableOpacity>
        </Link>


        <Link href="/debug" asChild>
          <TouchableOpacity style={[styles.navButton, styles.debugButton]}>
            <Text style={styles.debugText}>🔧 Debug Mode</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#1a237e',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  navigationContainer: {
    flex: 1,
    padding: 20,
    gap: 15,
  },
  navButton: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  navText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    fontWeight: '500',
  },
  debugButton: {
    backgroundColor: '#424242',
    marginTop: 'auto',
    marginBottom: 20,
  },
  debugText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
});

