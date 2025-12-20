import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { ChurchWithDistance, EventWithDistance } from '../../types';

// Type pour les items de la liste
type ListItem = (ChurchWithDistance & { itemType: 'church' }) | (EventWithDistance & { itemType: 'event' });

interface MapMarkerItemProps {
  item: ListItem;
  index: number;
  focused: boolean;
  onPress: (item: ListItem) => void;
  coordinate: { latitude: number; longitude: number }; // NECESSAIRE pour react-native-map-clustering
}

// Composant icône église memoized
const ChurchMarkerIcon = React.memo(({ focused }: { focused: boolean }) => (
  <View style={[styles.markerContainer, focused && styles.markerContainerFocused]}>
    <MaterialCommunityIcons name="cross" size={24} color="white" />
  </View>
));
ChurchMarkerIcon.displayName = 'ChurchMarkerIcon';

// Composant icône événement memoized
const EventMarkerIcon = React.memo(({ focused }: { focused: boolean }) => (
  <View style={[styles.eventMarkerContainer, focused && styles.eventMarkerContainerFocused]}>
    <MaterialCommunityIcons name="calendar-star" size={24} color="white" />
  </View>
));
EventMarkerIcon.displayName = 'EventMarkerIcon';

const MapMarkerItem: React.FC<MapMarkerItemProps> = ({ item, focused, onPress, coordinate }) => {
  // OPTIMIZATION: tracksViewChanges is critical for performance on Android
  // We set it to true initially to render the icon, then false to stop re-rendering
  const [tracksViewChanges, setTracksViewChanges] = React.useState(true);

  React.useEffect(() => {
    if (tracksViewChanges) {
      // Stop tracking changes after initial render
      // Small timeout ensures the icon has loaded/rendered
      const timeout = setTimeout(() => {
        setTracksViewChanges(false);
      }, 500); // 500ms should be enough for visibility
      return () => clearTimeout(timeout);
    }
  }, [tracksViewChanges]);

  // Re-enable tracking if content changes (e.g. focus state)
  React.useEffect(() => {
    setTracksViewChanges(true);
  }, [focused, item.itemType]);

  return (
    <Marker
      coordinate={coordinate} // Utilisation de la prop passée explicitement
      title={item.itemType === 'church' ? item.name : item.title}
      description={item.itemType === 'church' ? item.address : item.city}
      onPress={() => onPress(item)}
      tracksViewChanges={tracksViewChanges}
    >
      {item.itemType === 'church' ? (
        <ChurchMarkerIcon focused={focused} />
      ) : (
        <EventMarkerIcon focused={focused} />
      )}
    </Marker>
  );
};

// Memoization avec comparaison personnalisée pour éviter les re-renders inutiles
export default React.memo(MapMarkerItem, (prevProps, nextProps) => {
  // Ne re-render que si l'item ID ou le focus change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.focused === nextProps.focused
  );
});

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: '#EF4444',
    width: 36, // Réduit de 40
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2, // Réduit de 3
    borderColor: 'white',
    // Shadows simplifiées pour iPhone 7
    elevation: 3,
  },
  markerContainerFocused: {
    backgroundColor: '#DC2626',
    width: 40, // Réduit de 48
    height: 40,
    borderRadius: 20,
    // Suppression de transform: scale qui est coûteux
    borderWidth: 3,
    elevation: 4,
  },
  eventMarkerContainer: {
    backgroundColor: '#10B981',
    width: 36, // Réduit de 40
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2, // Réduit de 3
    borderColor: 'white',
    // Shadows simplifiées pour iPhone 7
    elevation: 3,
  },
  eventMarkerContainerFocused: {
    backgroundColor: '#059669',
    width: 40, // Réduit de 48
    height: 40,
    borderRadius: 20,
    // Suppression de transform: scale qui est coûteux
    borderWidth: 3,
    elevation: 4,
  },
});
