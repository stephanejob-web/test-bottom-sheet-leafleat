import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Platform, StatusBar, Linking, Alert } from 'react-native';
import { Card, Text, Searchbar, Chip, Avatar, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import mockEventsData from '../../mockEventsData.json';
import { Event, EventWithDistance } from '../../types';
import { calculateDistance } from '../../utils/geo';
import { cityCoordinates } from '../../constants/cities';
import { eventTypeConfig } from '../../constants/eventTypes';

const allEvents: Event[] = mockEventsData.data.events as Event[];

export default function ExploreScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  // Géolocalisation
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Géolocalisation désactivée',
            'Les événements seront affichés sans calcul de distance.'
          );
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
      } catch (error) {
        console.log('Erreur de géolocalisation', error);
      }
    })();
  }, []);

  // Détecter la recherche de ville
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchCenter(null);
      return;
    }

    const searchLower = searchQuery.toLowerCase().trim();
    const cityKey = Object.keys(cityCoordinates).find(city =>
      searchLower.includes(city) || city.includes(searchLower)
    );

    if (cityKey) {
      const coords = cityCoordinates[cityKey];
      setSearchCenter(coords);
    }
  }, [searchQuery]);

  // Détermine si on utilise la position actuelle de l'utilisateur
  const isUsingCurrentLocation = useMemo(() => {
    return searchCenter === null && location !== null;
  }, [searchCenter, location]);

  const filteredEvents = useMemo((): EventWithDistance[] => {
    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : null);

    if (!center) {
      return allEvents.map(event => ({ ...event, distance: 0 }));
    }

    return allEvents
      .map((event) => {
        const distance = calculateDistance(
          center.latitude,
          center.longitude,
          event.latitude,
          event.longitude
        );

        const matchesSearch = searchQuery === '' ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.churchName.toLowerCase().includes(searchQuery.toLowerCase());

        return { ...event, distance, matchesSearch };
      })
      .filter(({ matchesSearch }) => matchesSearch)
      .sort((a, b) => a.distance - b.distance);
  }, [location, searchCenter, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          Événements à proximité
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          {filteredEvents.length} événement(s) trouvé(s)
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Rechercher un événement ou une ville..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#6366F1"
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView style={styles.eventsList} contentContainerStyle={styles.eventsListContent}>
        {filteredEvents.map((event) => {
          const config = eventTypeConfig[event.type] || eventTypeConfig['evangelisation'];

          return (
            <Card key={event.id} style={styles.eventCard} mode="elevated" elevation={2}>
              <View style={styles.eventCardHeader}>
                <Avatar.Icon
                  icon={config.icon}
                  size={48}
                  style={[styles.eventIcon, { backgroundColor: config.color }]}
                />
                <View style={styles.eventHeaderInfo}>
                  <Chip
                    icon={config.icon}
                    style={[styles.eventTypeChip, { backgroundColor: config.color }]}
                    textStyle={styles.eventTypeChipText}
                    compact
                  >
                    {config.label}
                  </Chip>
                  <Text variant="bodySmall" style={styles.eventDate}>
                    {formatDate(event.date)} • {event.startTime}
                  </Text>
                </View>
              </View>

              <Card.Content style={styles.eventContent}>
                <Text variant="titleLarge" style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>

                <Text variant="bodyMedium" style={styles.eventDescription} numberOfLines={2}>
                  {event.description}
                </Text>

                <Divider style={styles.divider} />

                <View style={styles.eventInfoRow}>
                  <MaterialCommunityIcons name="church" size={16} color="#64748B" />
                  <Text variant="bodySmall" style={styles.eventInfoText} numberOfLines={1}>
                    {event.churchName}
                  </Text>
                </View>

                <View style={styles.eventInfoRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#64748B" />
                  <Text variant="bodySmall" style={styles.eventInfoText} numberOfLines={1}>
                    {event.city}, {event.country}
                  </Text>
                  {isUsingCurrentLocation && (
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceBadgeText}>
                        {event.distance.toFixed(1)} km
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.eventInfoRow}>
                  <MaterialCommunityIcons name="email" size={16} color="#64748B" />
                  <Text
                    variant="bodySmall"
                    style={[styles.eventInfoText, styles.linkText]}
                    onPress={() => Linking.openURL(`mailto:${event.email}`)}
                    numberOfLines={1}
                  >
                    {event.email}
                  </Text>
                </View>

                <View style={styles.eventInfoRow}>
                  <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
                  <Text
                    variant="bodySmall"
                    style={[styles.eventInfoText, styles.linkText]}
                    onPress={() => Linking.openURL(event.whatsapp)}
                    numberOfLines={1}
                  >
                    Rejoindre le groupe WhatsApp
                  </Text>
                </View>

                <View style={styles.eventActions}>
                  <Button
                    mode="outlined"
                    icon="phone"
                    onPress={() => Linking.openURL(`tel:${event.phone}`)}
                    style={styles.actionButton}
                    compact
                  >
                    Appeler
                  </Button>
                  <Button
                    mode="contained"
                    icon="map-marker"
                    onPress={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
                      Linking.openURL(url);
                    }}
                    style={styles.actionButtonPrimary}
                    compact
                  >
                    Itinéraire
                  </Button>
                </View>
              </Card.Content>
            </Card>
          );
        })}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#CBD5E1" />
            <Text variant="titleMedium" style={styles.emptyStateTitle}>
              Aucun événement trouvé
            </Text>
            <Text variant="bodyMedium" style={styles.emptyStateText}>
              Essayez de modifier votre recherche
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#64748B',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    elevation: 0,
    borderRadius: 12,
  },
  searchInput: {
    fontSize: 15,
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  eventIcon: {
    backgroundColor: '#6366F1',
  },
  eventHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  eventTypeChip: {
    alignSelf: 'flex-start',
  },
  eventTypeChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  eventDate: {
    color: '#64748B',
    fontWeight: '500',
  },
  eventContent: {
    paddingTop: 0,
  },
  eventTitle: {
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  eventDescription: {
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventInfoText: {
    color: '#64748B',
    flex: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
    color: '#6366F1',
  },
  distanceBadge: {
    backgroundColor: '#64748B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#64748B',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateText: {
    color: '#94A3B8',
    marginTop: 4,
  },
});
