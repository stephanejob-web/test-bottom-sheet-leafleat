import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Platform, Alert, Linking, StatusBar, ActivityIndicator } from 'react-native';
import { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import * as Location from 'expo-location';
import * as Calendar from 'expo-calendar';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Card, Text, Searchbar, Button, Surface, IconButton, Avatar, Divider, Dialog, Portal, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import mockApiResponse from '../../mockApiData.json';
import mockEventsData from '../../mockEventsData.json';
import { Church, ChurchWithDistance, Event, EventWithDistance } from '../../types';
import { calculateDistance } from '../../utils/geo';
import { cityCoordinates } from '../../constants/cities';
import { eventTypeConfig } from '../../constants/eventTypes';
import { useDebounce } from '../../hooks/use-debounce';

// Chargement des données depuis le mock API
const allChurches: Church[] = mockApiResponse.data.churches as Church[];
const allEvents: Event[] = mockEventsData.data.events as Event[];

// Type pour les éléments de la liste (églises ou événements)
type ListItem = (ChurchWithDistance & { itemType: 'church' }) | (EventWithDistance & { itemType: 'event' });

// Composant pour l'icône de marker personnalisée avec croix
const ChurchMarkerIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.markerContainer, focused && styles.markerContainerFocused]}>
    <MaterialCommunityIcons
      name="cross"
      size={24}
      color="white"
    />
  </View>
);

// Composant pour le marker de la position de l'utilisateur - Style Google Maps
const UserLocationMarker = () => (
  <View style={styles.userMarkerContainer}>
    <View style={styles.userMarkerAccuracyCircle} />
    <View style={styles.userMarkerDot} />
  </View>
);

// Composant pour l'icône de marker des événements (flag vert)
const EventMarkerIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.eventMarkerContainer, focused && styles.eventMarkerContainerFocused]}>
    <MaterialCommunityIcons
      name="calendar-star"
      size={24}
      color="white"
    />
  </View>
);

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(0);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [itemForDirections, setItemForDirections] = useState<ListItem | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [visibleRegion, setVisibleRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mapRef = useRef<any>(null); // ClusteredMapView type
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['25%', '50%', '95%'], []);

  // Débouncer la recherche pour éviter les re-renders excessifs
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Débouncer la région visible pour optimiser les performances pendant le pan/zoom
  const debouncedVisibleRegion = useDebounce(visibleRegion, 400);

  // Gérer le loading pendant les changements de région
  useEffect(() => {
    if (visibleRegion) {
      setIsLoading(true);
    }
  }, [visibleRegion]);

  // Désactiver le loading une fois le debounce terminé
  useEffect(() => {
    if (debouncedVisibleRegion) {
      setIsLoading(false);
    }
  }, [debouncedVisibleRegion]);

  // Détecter la recherche de ville et centrer la carte
  useEffect(() => {
    if (debouncedSearchQuery.trim() === '') {
      setSearchCenter(null);
      return;
    }

    const searchLower = debouncedSearchQuery.toLowerCase().trim();
    const cityKey = Object.keys(cityCoordinates).find(city =>
      searchLower.includes(city) || city.includes(searchLower)
    );

    if (cityKey) {
      const coords = cityCoordinates[cityKey];
      setSearchCenter(coords);

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }, 1000);
      }
    }
  }, [debouncedSearchQuery]);

  // Détermine si on utilise la position actuelle de l'utilisateur
  const isUsingCurrentLocation = useMemo(() => {
    return searchCenter === null && location !== null;
  }, [searchCenter, location]);

  // Filtrer et fusionner églises et événements par zone visible
  const filteredItemsWithDistance = useMemo((): ListItem[] => {
    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : null);

    // Si pas de centre, on affiche un message ou retourne vide
    if (!center) {
      return [];
    }

    // Calculer la bounding box de la zone visible (si disponible)
    let boundingBox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null = null;

    if (debouncedVisibleRegion) {
      // Ajouter une petite marge (20%) pour ne pas couper trop strict
      const marginLat = debouncedVisibleRegion.latitudeDelta * 0.2;
      const marginLng = debouncedVisibleRegion.longitudeDelta * 0.2;

      boundingBox = {
        minLat: debouncedVisibleRegion.latitude - (debouncedVisibleRegion.latitudeDelta / 2) - marginLat,
        maxLat: debouncedVisibleRegion.latitude + (debouncedVisibleRegion.latitudeDelta / 2) + marginLat,
        minLng: debouncedVisibleRegion.longitude - (debouncedVisibleRegion.longitudeDelta / 2) - marginLng,
        maxLng: debouncedVisibleRegion.longitude + (debouncedVisibleRegion.longitudeDelta / 2) + marginLng,
      };
    }

    // Filtrer et calculer distance pour les églises
    const churchesWithDistance = allChurches
      .filter((church) => {
        // Filtrer par bounding box si disponible
        if (boundingBox) {
          const inBounds = church.latitude >= boundingBox.minLat &&
                          church.latitude <= boundingBox.maxLat &&
                          church.longitude >= boundingBox.minLng &&
                          church.longitude <= boundingBox.maxLng;
          if (!inBounds) return false;
        }

        // Filtrer par recherche
        const matchesSearch = searchQuery === '' ||
          church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          church.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          church.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
      })
      .map((church) => {
        const distance = calculateDistance(
          center.latitude,
          center.longitude,
          church.latitude,
          church.longitude
        );

        return { ...church, distance, itemType: 'church' as const };
      });

    // Filtrer et calculer distance pour les événements
    const eventsWithDistance = allEvents
      .filter((event) => {
        // Filtrer par bounding box si disponible
        if (boundingBox) {
          const inBounds = event.latitude >= boundingBox.minLat &&
                          event.latitude <= boundingBox.maxLat &&
                          event.longitude >= boundingBox.minLng &&
                          event.longitude <= boundingBox.maxLng;
          if (!inBounds) return false;
        }

        // Filtrer par recherche
        const matchesSearch = searchQuery === '' ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.churchName.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
      })
      .map((event) => {
        const distance = calculateDistance(
          center.latitude,
          center.longitude,
          event.latitude,
          event.longitude
        );

        return { ...event, distance, itemType: 'event' as const };
      });

    // Fusionner et trier par distance
    const allItems = [...churchesWithDistance, ...eventsWithDistance];

    return allItems
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 200); // Limite à 200 items pour optimiser les performances
  }, [location, searchCenter, searchQuery, debouncedVisibleRegion]);

  // Compteurs séparés pour églises et événements
  const churchCount = useMemo(() =>
    filteredItemsWithDistance.filter(item => item.itemType === 'church').length,
    [filteredItemsWithDistance]
  );

  const eventCount = useMemo(() =>
    filteredItemsWithDistance.filter(item => item.itemType === 'event').length,
    [filteredItemsWithDistance]
  );

  const handleItemPress = useCallback((item: ListItem) => {
    setSelectedItem(item);
    bottomSheetRef.current?.snapToIndex(2);
  }, []);

  const handleDirections = useCallback((item: ListItem) => {
    setItemForDirections(item);
    setShowMapDialog(true);
  }, []);

  const openInGoogleMaps = useCallback((item: ListItem) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps'));
    setShowMapDialog(false);
  }, []);

  const openInAppleMaps = useCallback((item: ListItem) => {
    const url = `http://maps.apple.com/?daddr=${item.latitude},${item.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Plans'));
    setShowMapDialog(false);
  }, []);

  const openInWaze = useCallback((item: ListItem) => {
    const url = `https://waze.com/ul?ll=${item.latitude},${item.longitude}&navigate=yes`;
    Linking.canOpenURL('waze://').then(supported => {
      if (supported) {
        Linking.openURL(`waze://?ll=${item.latitude},${item.longitude}&navigate=yes`);
      } else {
        Linking.openURL(url);
      }
    }).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Waze'));
    setShowMapDialog(false);
  }, []);

  const animateToItem = useCallback((item: ListItem) => {
    mapRef.current?.animateToRegion({
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 1000);
  }, []);

  // Gérer le changement de région visible sur la carte
  const handleRegionChangeComplete = useCallback((region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
    setVisibleRegion(region);
  }, []);

  // Fonction pour recentrer sur la position de l'utilisateur
  const recenterOnUser = useCallback(async () => {
    try {
      if (location) {
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
        setSearchCenter(null);
        setSearchQuery('');
      } else {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
        mapRef.current?.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
        setSearchCenter(null);
        setSearchQuery('');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de récupérer votre position');
    }
  }, [location]);

  // Géolocalisation
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Géolocalisation désactivée',
            'Les églises et événements seront affichés autour de Paris.'
          );
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);

        if (mapRef.current) {
          timeoutId = setTimeout(() => {
            mapRef.current?.animateToRegion({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }, 1500);
          }, 1000);
        }
      } catch {
        Alert.alert(
          'Erreur de géolocalisation',
          'Les églises et événements seront affichés autour de Paris.'
        );
      }
    })();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Helper pour formatter la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Fonction pour ajouter un événement au calendrier
  const addToCalendar = useCallback(async (event: EventWithDistance) => {
    try {
      // Demander les permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Vous devez autoriser l\'accès au calendrier pour ajouter cet événement.'
        );
        return;
      }

      // Obtenir les calendriers disponibles
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      // Trouver le calendrier par défaut ou le premier disponible
      const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Erreur', 'Aucun calendrier disponible');
        return;
      }

      // Créer les dates de début et de fin
      const eventDate = new Date(event.date);
      const [startHour, startMinute] = event.startTime.split(':').map(Number);
      const [endHour, endMinute] = event.endTime.split(':').map(Number);

      const startDate = new Date(eventDate);
      startDate.setHours(startHour, startMinute, 0, 0);

      const endDate = new Date(eventDate);
      endDate.setHours(endHour, endMinute, 0, 0);

      // Créer l'événement dans le calendrier
      await Calendar.createEventAsync(defaultCalendar.id, {
        title: event.title,
        startDate: startDate,
        endDate: endDate,
        location: `${event.address}, ${event.city}`,
        notes: `${event.description}\n\nÉglise organisatrice: ${event.churchName}\nOrganisateur: ${event.organizer}\n\nContact:\nTél: ${event.phone}\nEmail: ${event.email}\nWhatsApp: ${event.whatsapp}`,
        timeZone: 'Europe/Paris',
        alarms: [{ relativeOffset: -60 }], // Rappel 1h avant
      });

      Alert.alert(
        'Événement ajouté',
        'L\'événement a été ajouté à votre calendrier avec succès.'
      );
    } catch (error) {
      console.error('Erreur lors de l\'ajout au calendrier:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ajouter l\'événement au calendrier. Veuillez réessayer.'
      );
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Map avec Clustering */}
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 48.8566,
          longitude: 2.3522,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onRegionChangeComplete={handleRegionChangeComplete}
        // Configuration du clustering
        clusterColor="#6366F1"
        clusterTextColor="#FFFFFF"
        clusterFontFamily="System"
        radius={50}
        maxZoom={20}
        minZoom={0}
        extent={512}
        nodeSize={64}
        // Clustering toujours actif
        clustering={true}
        // Animation fluide
        animationEnabled={true}
        layoutAnimationConf={{
          duration: 200,
        }}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Ma position"
          >
            <UserLocationMarker />
          </Marker>
        )}

        {filteredItemsWithDistance.map((item, index) => (
          <Marker
            key={`${item.itemType}-${item.id}`}
            coordinate={{
              latitude: item.latitude,
              longitude: item.longitude,
            }}
            title={item.itemType === 'church' ? item.name : item.title}
            description={item.itemType === 'church' ? item.address : item.city}
            onPress={() => handleItemPress(item)}
          >
            {item.itemType === 'church' ? (
              <ChurchMarkerIcon focused={focusedItemIndex === index} />
            ) : (
              <EventMarkerIcon focused={focusedItemIndex === index} />
            )}
          </Marker>
        ))}
      </ClusteredMapView>

      {/* Barre de recherche toujours visible */}
      <Surface style={styles.searchSection} elevation={5}>
        <Searchbar
          placeholder="Rechercher une ville..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          iconColor="#6366F1"
          clearIcon={searchQuery ? "close-circle" : undefined}
          onClearIconPress={() => setSearchQuery('')}
          inputStyle={styles.searchInput}
          elevation={0}
        />
      </Surface>

      {/* Bouton de recentrage sur la position */}
      <Surface style={styles.recenterButton} elevation={4}>
        <IconButton
          icon="crosshairs-gps"
          size={24}
          iconColor="#6366F1"
          onPress={recenterOnUser}
          style={styles.recenterIconButton}
        />
      </Surface>

      {/* Indicateur de chargement */}
      {isLoading && (
        <Surface style={styles.loadingIndicator} elevation={3}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text variant="bodySmall" style={styles.loadingText}>
            Chargement...
          </Text>
        </Surface>
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {/* Header conditionnel - reste fixe en haut */}
        {selectedItem ? (
          selectedItem.itemType === 'church' ? (
            // Header fixe église
            <View style={styles.detailHeaderModern}>
              <IconButton
                icon="arrow-left"
                size={28}
                iconColor="white"
                onPress={() => setSelectedItem(null)}
                style={styles.detailBackButton}
              />
              <View style={styles.detailHeaderContent}>
                <Text variant="headlineMedium" style={styles.detailChurchName}>
                  {selectedItem.name}
                </Text>
                {isUsingCurrentLocation && (
                  <View style={styles.detailDistanceBadge}>
                    <Text style={styles.detailDistanceText}>
                      {selectedItem.distance.toFixed(1)} km
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Header fixe événement
            <View style={[styles.detailHeaderModern, { backgroundColor: eventTypeConfig[selectedItem.type]?.color || '#10B981' }]}>
              <IconButton
                icon="arrow-left"
                size={28}
                iconColor="white"
                onPress={() => setSelectedItem(null)}
                style={styles.detailBackButton}
              />
              <View style={styles.detailHeaderContent}>
                <Text variant="headlineMedium" style={styles.detailChurchName}>
                  {selectedItem.title}
                </Text>
                {isUsingCurrentLocation && (
                  <View style={styles.detailDistanceBadge}>
                    <Text style={styles.detailDistanceText}>
                      {selectedItem.distance.toFixed(1)} km
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )
        ) : (
          // Header fixe liste
          <View style={styles.bottomSheetHeader}>
            <View style={styles.headerTop}>
              <Avatar.Icon
                icon="map-marker-multiple"
                size={40}
                style={styles.headerAvatar}
              />
              <View style={styles.headerTextContainer}>
                <Text variant="headlineSmall" style={styles.bottomSheetTitle}>
                  Églises et événements à proximité
                </Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  {churchCount} église(s) • {eventCount} événement(s)
                </Text>
              </View>
              <IconButton
                icon="chevron-down"
                size={24}
                iconColor="#64748B"
                onPress={() => bottomSheetRef.current?.snapToIndex(0)}
                style={styles.minimizeButton}
              />
            </View>
          </View>
        )}

        {/* Contenu */}
        <BottomSheetScrollView style={styles.bottomSheetContent}>
          {selectedItem ? (
            selectedItem.itemType === 'church' ? (
              // Vue détaillée église
              <View style={styles.detailsContainerModern}>
                <View style={styles.quickActionsContainer}>
                  <Button
                    mode="contained"
                    icon="phone"
                    style={styles.quickActionButton}
                    labelStyle={styles.quickActionLabel}
                    onPress={() => Linking.openURL(`tel:${selectedItem.phone}`)}
                  >
                    Appeler
                  </Button>
                  <Button
                    mode="contained"
                    icon="email"
                    style={styles.quickActionButton}
                    labelStyle={styles.quickActionLabel}
                    onPress={() => Linking.openURL(`mailto:${selectedItem.email}`)}
                  >
                    Email
                  </Button>
                  <Button
                    mode="contained"
                    icon="directions"
                    style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
                    labelStyle={styles.quickActionLabel}
                    onPress={() => handleDirections(selectedItem)}
                  >
                    Itinéraire
                  </Button>
                </View>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="information" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>À propos</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {selectedItem.description}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="map-marker" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Adresse</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {selectedItem.address}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="account-tie" size={32} style={styles.detailCardIcon} />
                      <View style={styles.detailCardHeaderText}>
                        <Text variant="labelSmall" style={styles.detailCardLabel}>Pasteur</Text>
                        <Text variant="titleMedium" style={styles.detailCardTitle}>{selectedItem.pastor}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="phone" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Contact</Text>
                    </View>
                    <View style={styles.contactInfoContainer}>
                      <View style={styles.contactInfoRow}>
                        <Text variant="bodyMedium" style={styles.contactInfoLabel}>Téléphone :</Text>
                        <Text variant="bodyMedium" style={styles.contactInfoValue}>{selectedItem.phone}</Text>
                      </View>
                      <View style={styles.contactInfoRow}>
                        <Text variant="bodyMedium" style={styles.contactInfoLabel}>Email :</Text>
                        <Text variant="bodyMedium" style={styles.contactInfoValue}>{selectedItem.email}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="calendar-clock" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Horaires des cultes</Text>
                    </View>
                    <View style={styles.servicesContainer}>
                      {selectedItem.services.map((service, index) => (
                        <Chip
                          key={index}
                          icon="clock-outline"
                          mode="flat"
                          style={styles.serviceChipModern}
                          textStyle={styles.serviceChipText}
                        >
                          {service}
                        </Chip>
                      ))}
                    </View>
                  </Card.Content>
                </Card>
              </View>
            ) : (
              // Vue détaillée événement
              <View style={styles.detailsContainerModern}>
                <View style={styles.quickActionsContainer}>
                  <Button
                    mode="contained"
                    icon="phone"
                    style={[styles.quickActionButton, { backgroundColor: '#3B82F6' }]}
                    labelStyle={styles.quickActionLabel}
                    onPress={() => Linking.openURL(`tel:${selectedItem.phone}`)}
                  >
                    Appeler
                  </Button>
                  <Button
                    mode="contained"
                    icon="whatsapp"
                    style={[styles.quickActionButton, { backgroundColor: '#25D366' }]}
                    labelStyle={styles.quickActionLabel}
                    onPress={() => Linking.openURL(selectedItem.whatsapp)}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    mode="contained"
                    icon="directions"
                    style={[styles.quickActionButton, { backgroundColor: '#6366F1' }]}
                    labelStyle={styles.quickActionLabel}
                    onPress={() => handleDirections(selectedItem)}
                  >
                    Itinéraire
                  </Button>
                </View>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="calendar" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Date et heure</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {formatDate(selectedItem.date)} • {selectedItem.startTime} - {selectedItem.endTime}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="information" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Description</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {selectedItem.description}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="church" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Église organisatrice</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {selectedItem.churchName}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="map-marker" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Lieu</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {selectedItem.address}
                    </Text>
                    <Text variant="bodySmall" style={[styles.detailCardText, { marginTop: 4 }]}>
                      {selectedItem.city}, {selectedItem.country}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="account" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Organisateur</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.detailCardText}>
                      {selectedItem.organizer}
                    </Text>
                  </Card.Content>
                </Card>

                <Card mode="outlined" style={styles.detailCard}>
                  <Card.Content>
                    <View style={styles.detailCardHeader}>
                      <Avatar.Icon icon="email" size={32} style={styles.detailCardIcon} />
                      <Text variant="titleMedium" style={styles.detailCardTitle}>Contact</Text>
                    </View>
                    <View style={styles.contactInfoContainer}>
                      <View style={styles.contactInfoRow}>
                        <Text variant="bodyMedium" style={styles.contactInfoLabel}>Email :</Text>
                        <Text variant="bodyMedium" style={styles.contactInfoValue}>{selectedItem.email}</Text>
                      </View>
                      <View style={styles.contactInfoRow}>
                        <Text variant="bodyMedium" style={styles.contactInfoLabel}>Téléphone :</Text>
                        <Text variant="bodyMedium" style={styles.contactInfoValue}>{selectedItem.phone}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                <Button
                  mode="contained"
                  icon="calendar-plus"
                  onPress={() => addToCalendar(selectedItem)}
                  style={styles.addToCalendarButton}
                  labelStyle={styles.addToCalendarLabel}
                >
                  Ajouter au calendrier
                </Button>
              </View>
            )
          ) : (
            // Liste verticale style Google Maps
            <View style={styles.churchListVertical}>
              {filteredItemsWithDistance.map((item, index) => (
                <Card
                  key={`${item.itemType}-${item.id}`}
                  style={[
                    styles.churchCardCompact,
                    focusedItemIndex === index && styles.churchCardCompactFocused,
                  ]}
                  onPress={() => {
                    setFocusedItemIndex(index);
                    animateToItem(item);
                  }}
                  mode="elevated"
                  elevation={focusedItemIndex === index ? 4 : 1}
                >
                  <View style={styles.cardCompactContent}>
                    <View style={styles.cardCompactMain}>
                      <Avatar.Icon
                        icon={item.itemType === 'church' ? "cross" : "calendar-star"}
                        size={48}
                        style={[
                          styles.cardCompactAvatar,
                          item.itemType === 'church' && { backgroundColor: '#EF4444' },
                          item.itemType === 'event' && { backgroundColor: '#10B981' },
                          focusedItemIndex === index && styles.cardCompactAvatarFocused,
                        ]}
                      />

                      <View style={styles.cardCompactInfo}>
                        <Text
                          variant="titleMedium"
                          style={styles.cardCompactTitle}
                          numberOfLines={1}
                        >
                          {item.itemType === 'church' ? item.name : item.title}
                        </Text>

                        {isUsingCurrentLocation && (
                          <View style={styles.cardCompactMeta}>
                            <View style={styles.distanceBadge}>
                              <Text style={styles.distanceBadgeText}>
                                {item.distance.toFixed(1)} km
                              </Text>
                            </View>
                          </View>
                        )}

                        <Text
                          variant="bodySmall"
                          style={styles.cardCompactAddress}
                          numberOfLines={2}
                        >
                          {item.itemType === 'church' ? item.address : `${item.city} • ${formatDate(item.date)}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardCompactActions}>
                      <IconButton
                        icon="information-outline"
                        size={20}
                        iconColor="#6366F1"
                        containerColor="#EEF2FF"
                        onPress={() => handleItemPress(item)}
                        style={styles.cardCompactActionButton}
                      />
                      <Button
                        mode="contained"
                        icon="directions"
                        compact
                        onPress={() => handleDirections(item)}
                        style={styles.cardCompactDirectionsButton}
                        labelStyle={styles.cardCompactDirectionsLabel}
                      >
                        Itinéraire
                      </Button>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Dialog navigation */}
      <Portal>
        <Dialog visible={showMapDialog} onDismiss={() => setShowMapDialog(false)} style={styles.navigationDialog}>
          <Dialog.Title style={styles.dialogTitle}>
            <Avatar.Icon icon="navigation" size={40} style={styles.dialogIcon} />
            <Text variant="headlineSmall" style={styles.dialogTitleText}>Ouvrir l'itinéraire</Text>
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium" style={styles.dialogDescription}>
              Vers <Text style={styles.churchName}>
                {itemForDirections?.itemType === 'church' ? itemForDirections.name : itemForDirections?.title}
              </Text>
            </Text>
            <Divider style={styles.dialogDivider} />
            <Text variant="labelSmall" style={styles.dialogLabel}>CHOISISSEZ VOTRE APPLICATION :</Text>

            <View style={styles.navigationApps}>
              <Card mode="outlined" style={styles.appCard} onPress={() => itemForDirections && openInGoogleMaps(itemForDirections)}>
                <Card.Content style={styles.appCardContent}>
                  <Avatar.Icon icon="google-maps" size={48} style={styles.googleMapsIcon} />
                  <Text variant="titleMedium" style={styles.appName}>Google Maps</Text>
                </Card.Content>
              </Card>

              {Platform.OS === 'ios' && (
                <Card mode="outlined" style={styles.appCard} onPress={() => itemForDirections && openInAppleMaps(itemForDirections)}>
                  <Card.Content style={styles.appCardContent}>
                    <Avatar.Icon icon="map" size={48} style={styles.appleMapsIcon} />
                    <Text variant="titleMedium" style={styles.appName}>Plans</Text>
                  </Card.Content>
                </Card>
              )}

              <Card mode="outlined" style={styles.appCard} onPress={() => itemForDirections && openInWaze(itemForDirections)}>
                <Card.Content style={styles.appCardContent}>
                  <Avatar.Icon icon="waze" size={48} style={styles.wazeIcon} />
                  <Text variant="titleMedium" style={styles.appName}>Waze</Text>
                </Card.Content>
              </Card>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMapDialog(false)}>Annuler</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchSection: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 10,
    left: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    padding: 12,
  },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    elevation: 0,
  },
  searchInput: {
    fontSize: 15,
  },
  bottomSheetBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  handleIndicator: {
    backgroundColor: '#CBD5E1',
    width: 48,
    height: 5,
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: 'white',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    backgroundColor: '#EEF2FF',
  },
  headerTextContainer: {
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  minimizeButton: {
    margin: 0,
  },
  bottomSheetContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  churchListVertical: {
    gap: 12,
    paddingHorizontal: 16,
  },
  churchCardCompact: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  churchCardCompactFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFC',
  },
  cardCompactContent: {
    padding: 12,
  },
  cardCompactMain: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardCompactAvatar: {
    backgroundColor: '#F1F5F9',
  },
  cardCompactAvatarFocused: {
    backgroundColor: '#6366F1',
  },
  cardCompactInfo: {
    flex: 1,
    gap: 6,
  },
  cardCompactTitle: {
    fontWeight: '600',
    color: '#1E293B',
  },
  cardCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardCompactAddress: {
    color: '#64748B',
    lineHeight: 18,
  },
  cardCompactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardCompactActionButton: {
    margin: 0,
  },
  cardCompactDirectionsButton: {
    backgroundColor: '#6366F1',
  },
  cardCompactDirectionsLabel: {
    fontSize: 13,
  },
  distanceBadge: {
    backgroundColor: '#64748B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  distanceBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  recenterButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 155 : (StatusBar.currentHeight || 0) + 105,
    right: 16,
    zIndex: 10,
    borderRadius: 28,
    backgroundColor: 'white',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenterIconButton: {
    margin: 0,
  },
  loadingIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : (StatusBar.currentHeight || 0) + 80,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  detailsContainerModern: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailHeaderModern: {
    backgroundColor: '#6366F1',
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
  },
  detailBackButton: {
    position: 'absolute',
    top: 24,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    width: 44,
    height: 44,
    margin: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailHeaderContent: {
    marginTop: 48,
  },
  detailChurchName: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailDistanceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  detailDistanceText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
  },
  quickActionButtonPrimary: {
    backgroundColor: '#6366F1',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  detailCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailCardHeaderText: {
    flex: 1,
  },
  detailCardIcon: {
    backgroundColor: '#EEF2FF',
  },
  detailCardTitle: {
    fontWeight: '600',
    color: '#1E293B',
  },
  detailCardLabel: {
    color: '#64748B',
    marginBottom: 4,
  },
  detailCardText: {
    color: '#475569',
    lineHeight: 22,
  },
  contactInfoContainer: {
    gap: 12,
    marginTop: 8,
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfoLabel: {
    color: '#64748B',
    fontWeight: '500',
  },
  contactInfoValue: {
    color: '#1E293B',
    fontWeight: '600',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  serviceChipModern: {
    backgroundColor: '#EEF2FF',
  },
  serviceChipText: {
    color: '#6366F1',
    fontWeight: '500',
  },
  markerContainer: {
    backgroundColor: '#EF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerContainerFocused: {
    backgroundColor: '#6366F1',
    width: 48,
    height: 48,
    borderRadius: 24,
    transform: [{ scale: 1.1 }],
  },
  userMarkerContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerAccuracyCircle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  userMarkerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4285F4',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 6,
  },
  eventMarkerContainer: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  eventMarkerContainerFocused: {
    backgroundColor: '#059669',
    width: 48,
    height: 48,
    borderRadius: 24,
    transform: [{ scale: 1.1 }],
  },
  navigationDialog: {
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 20,
  },
  dialogTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  dialogIcon: {
    backgroundColor: '#EEF2FF',
  },
  dialogTitleText: {
    fontWeight: '600',
  },
  dialogContent: {
    paddingTop: 8,
  },
  dialogDescription: {
    marginBottom: 12,
  },
  churchName: {
    fontWeight: '600',
    color: '#6366F1',
  },
  dialogDivider: {
    marginVertical: 16,
  },
  dialogLabel: {
    opacity: 0.6,
    marginBottom: 16,
    fontWeight: '600',
  },
  navigationApps: {
    gap: 12,
  },
  appCard: {
    borderColor: '#E2E8F0',
    borderWidth: 2,
    borderRadius: 12,
  },
  appCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  googleMapsIcon: {
    backgroundColor: '#4285F4',
  },
  appleMapsIcon: {
    backgroundColor: '#007AFF',
  },
  wazeIcon: {
    backgroundColor: '#33CCFF',
  },
  appName: {
    fontWeight: '500',
  },
  addToCalendarButton: {
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  addToCalendarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  radiusSliderContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  radiusSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  radiusSliderLabel: {
    color: '#6366F1',
    fontWeight: '600',
  },
  radiusSlider: {
    width: '100%',
    height: 40,
  },
  radiusSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  radiusSliderLabelText: {
    color: '#94A3B8',
  },
  radiusFloatingChip: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 155 : (StatusBar.currentHeight || 0) + 105,
    left: 16,
    zIndex: 10,
    borderRadius: 20,
    backgroundColor: 'white',
  },
  radiusChip: {
    backgroundColor: 'transparent',
    marginHorizontal: 0,
    marginVertical: 0,
  },
  radiusChipText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 12,
  },
  viewModeSegmented: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 215 : (StatusBar.currentHeight || 0) + 165,
    left: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 8,
  },
  segmentedButtons: {
    borderRadius: 8,
  },
  segmentButton: {
    borderRadius: 8,
  },
  radiusDialogMinimal: {
    maxWidth: 280,
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.47)',
  },
  radiusDialogContentMinimal: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  radiusValueDisplayMinimal: {
    color: '#6366F1',
    fontWeight: 'bold',
    marginBottom: 20,
    fontSize: 40,
  },
  radiusDialogSlider: {
    width: '100%',
    height: 40,
  },
  radiusDialogLabelsMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  radiusDialogLabelText: {
    color: '#94A3B8',
    fontSize: 11,
  },
});
