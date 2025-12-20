import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Platform, Alert, Linking, StatusBar, ActivityIndicator } from 'react-native';
import { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import * as Location from 'expo-location';
import * as Calendar from 'expo-calendar';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Card, Text, Searchbar, Button, Surface, IconButton, Avatar, Divider, Dialog, Portal, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import mockApiResponse from '../../mockApiData.json';
import mockEventsData from '../../mockEventsData.json';
import { Church, ChurchWithDistance, Event, EventWithDistance } from '../../types';
import { calculateDistance, calculateDistancesForItems, filterItemsByBoundingBox } from '../../utils/geo';
import { cityCoordinates } from '../../constants/cities';
import { eventTypeConfig } from '../../constants/eventTypes';
import { useDebounce } from '../../hooks/use-debounce';
import MapMarkerItem from '../components/MapMarkerItem';
import ChurchDetail from '../components/ChurchDetail';
import EventDetail from '../components/EventDetail';
import ListItemCard from '../components/ListItemCard';

// Chargement des données depuis le mock API
const allChurches: Church[] = mockApiResponse.data.churches as Church[];
const allEvents: Event[] = mockEventsData.data.events as Event[];

// Type pour les éléments de la liste (églises ou événements)
type ListItem = (ChurchWithDistance & { itemType: 'church' }) | (EventWithDistance & { itemType: 'event' });

// Composant pour le marker de la position de l'utilisateur - Style Google Maps
const UserLocationMarker = () => (
  <View style={styles.userMarkerContainer}>
    <View style={styles.userMarkerAccuracyCircle} />
    <View style={styles.userMarkerDot} />
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
  const [isLoadingViewport, setIsLoadingViewport] = useState(false);

  // Nouveaux états pour l'architecture optimisée
  const [validatedRegion, setValidatedRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [itemsInViewport, setItemsInViewport] = useState<ListItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<ListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [distanceCache, setDistanceCache] = useState<Map<string, number>>(new Map());

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
      setIsLoadingViewport(true);
    }
  }, [visibleRegion]);

  // Désactiver le loading une fois le debounce terminé
  useEffect(() => {
    if (debouncedVisibleRegion) {
      setIsLoadingViewport(false);
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

  // Map markers - SANS calcul de distance (uniquement filtrage par recherche)
  const mapMarkers = useMemo((): ListItem[] => {
    // Filtrer uniquement par searchQuery
    const churchesFiltered = allChurches
      .filter((church) => {
        const matchesSearch = searchQuery === '' ||
          church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          church.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          church.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      })
      .map(church => ({ ...church, distance: 0, itemType: 'church' as const }));

    const eventsFiltered = allEvents
      .filter((event) => {
        const matchesSearch = searchQuery === '' ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.churchName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .map(event => ({ ...event, distance: 0, itemType: 'event' as const }));

    return [...churchesFiltered, ...eventsFiltered];
  }, [searchQuery]);

  // Items dans viewport actuel - Filtrage géométrique SANS distance
  const itemsInViewportMemo = useMemo((): ListItem[] => {
    if (!debouncedVisibleRegion) return [];

    return filterItemsByBoundingBox(mapMarkers, debouncedVisibleRegion);
  }, [mapMarkers, debouncedVisibleRegion]);

  // Synchroniser itemsInViewport
  useEffect(() => {
    setItemsInViewport(itemsInViewportMemo);
  }, [itemsInViewportMemo]);

  // Reset validation lors du changement de recherche
  useEffect(() => {
    if (debouncedSearchQuery) {
      setValidatedRegion(null);
      setDisplayedItems([]);
      setCurrentPage(0);
    }
  }, [debouncedSearchQuery]);

  // Clear cache si trop gros
  useEffect(() => {
    if (distanceCache.size > 500) {
      setDistanceCache(new Map());
    }
  }, [searchCenter, location, distanceCache]);

  // Compteurs séparés pour églises et événements (basés sur displayedItems)
  const churchCount = useMemo(() =>
    displayedItems.filter(item => item.itemType === 'church').length,
    [displayedItems]
  );

  const eventCount = useMemo(() =>
    displayedItems.filter(item => item.itemType === 'event').length,
    [displayedItems]
  );

  // Actualisation automatique quand la région change
  useEffect(() => {
    if (!debouncedVisibleRegion || itemsInViewport.length === 0) {
      setDisplayedItems([]);
      setValidatedRegion(null);
      return;
    }

    // Vérifier si la région a vraiment changé de manière significative
    if (validatedRegion) {
      const regionChanged =
        Math.abs(validatedRegion.latitude - debouncedVisibleRegion.latitude) > 0.001 ||
        Math.abs(validatedRegion.longitude - debouncedVisibleRegion.longitude) > 0.001 ||
        Math.abs(validatedRegion.latitudeDelta - debouncedVisibleRegion.latitudeDelta) > 0.001;

      if (!regionChanged) return; // Pas de changement significatif
    }

    setIsCalculatingDistances(true);
    setValidatedRegion(debouncedVisibleRegion);
    setCurrentPage(0);

    // Obtenir le centre pour le calcul de distance
    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : debouncedVisibleRegion);

    // Calculer distance UNIQUEMENT pour les 20 premiers items
    const itemsToCalculate = itemsInViewport.slice(0, ITEMS_PER_PAGE);
    const cacheKeyPrefix = `${center.latitude.toFixed(3)}-${center.longitude.toFixed(3)}`;

    const itemsWithDistance = calculateDistancesForItems(
      itemsToCalculate,
      center.latitude,
      center.longitude,
      distanceCache,
      cacheKeyPrefix
    );

    setDisplayedItems(itemsWithDistance);
    setIsCalculatingDistances(false);

    // Expand bottom sheet pour montrer les résultats (uniquement si pas déjà ouvert)
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }
  }, [debouncedVisibleRegion, itemsInViewport, searchCenter, location, distanceCache, validatedRegion]);

  // Handler pour pagination ("Charger plus")
  const handleLoadMore = useCallback(() => {
    if (!validatedRegion || isCalculatingDistances) return;

    const nextPage = currentPage + 1;
    const startIdx = nextPage * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const nextBatch = itemsInViewport.slice(startIdx, endIdx);

    if (nextBatch.length === 0) return;

    setIsCalculatingDistances(true);

    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : validatedRegion);

    const cacheKeyPrefix = `${center.latitude.toFixed(3)}-${center.longitude.toFixed(3)}`;

    const batchWithDistance = calculateDistancesForItems(
      nextBatch,
      center.latitude,
      center.longitude,
      distanceCache,
      cacheKeyPrefix
    );

    // Fusionner et re-trier
    const allItems = [...displayedItems, ...batchWithDistance];
    const sortedItems = allItems.sort((a, b) => a.distance - b.distance);

    setDisplayedItems(sortedItems);
    setCurrentPage(nextPage);
    setIsCalculatingDistances(false);
  }, [currentPage, itemsInViewport, displayedItems, validatedRegion, searchCenter, location, distanceCache, isCalculatingDistances]);

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

        {mapMarkers.map((item, index) => (
          <MapMarkerItem
            key={`${item.itemType}-${item.id}`}
            item={item}
            index={index}
            focused={focusedItemIndex === index}
            onPress={handleItemPress}
          />
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

      {/* Indicateur de chargement discret */}
      {isCalculatingDistances && (
        <Surface style={styles.loadingIndicatorCompact} elevation={2}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text variant="bodySmall" style={styles.loadingTextCompact}>
            Actualisation...
          </Text>
        </Surface>
      )}

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

      {/* Indicateur de chargement moderne */}
      {isLoadingViewport && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIndicator}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
            <View style={styles.loadingTextContainer}>
              <Text style={styles.loadingText}>Actualisation</Text>
              <View style={styles.loadingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        </View>
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
        <BottomSheetFlatList
          data={selectedItem ? [] : displayedItems}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          renderItem={({ item, index }) => (
            <ListItemCard
              item={item}
              index={index}
              focused={focusedItemIndex === index}
              onPress={handleItemPress}
              onDirections={handleDirections}
              onAnimate={(item, index) => {
                setFocusedItemIndex(index);
                animateToItem(item);
              }}
              formatDate={formatDate}
            />
          )}
          ListHeaderComponent={
            selectedItem ? (
              // Vue détaillée église ou événement
              selectedItem.itemType === 'church' ? (
                <ChurchDetail
                  item={selectedItem}
                  onDirections={handleDirections}
                />
              ) : (
                <EventDetail
                  item={selectedItem}
                  onDirections={handleDirections}
                  formatDate={formatDate}
                />
              )
            ) : (
              // États vides et loading
              <>
                {/* État vide initial - Aucune région validée */}
                {!validatedRegion && displayedItems.length === 0 && (
                  <View style={styles.emptyStateContainer}>
                    <Avatar.Icon
                      icon="map-search"
                      size={80}
                      style={styles.emptyStateIcon}
                    />
                    <Text variant="headlineSmall" style={styles.emptyStateTitle}>
                      Explorez la carte
                    </Text>
                    <Text variant="bodyMedium" style={styles.emptyStateText}>
                      Déplacez la carte pour découvrir les églises et événements autour de vous. La liste s'actualisera automatiquement.
                    </Text>
                  </View>
                )}

                {/* Aucun résultat dans la région validée */}
                {validatedRegion && displayedItems.length === 0 && !isCalculatingDistances && (
                  <View style={styles.emptyStateContainer}>
                    <Avatar.Icon
                      icon="map-marker-off"
                      size={80}
                      style={styles.emptyStateIcon}
                    />
                    <Text variant="headlineSmall" style={styles.emptyStateTitle}>
                      Aucun résultat
                    </Text>
                    <Text variant="bodyMedium" style={styles.emptyStateText}>
                      Aucune église ou événement trouvé dans cette zone. Essayez d'élargir la zone de recherche.
                    </Text>
                  </View>
                )}

                {/* Loading - Calcul des distances */}
                {isCalculatingDistances && (
                  <View style={styles.calculatingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text variant="bodyLarge" style={styles.calculatingText}>
                      Calcul des distances...
                    </Text>
                  </View>
                )}
              </>
            )
          }
          ListFooterComponent={
            displayedItems.length > 0 &&
            displayedItems.length < itemsInViewport.length &&
            !isCalculatingDistances ? (
              <Button
                mode="outlined"
                onPress={handleLoadMore}
                style={styles.loadMoreButton}
                labelStyle={styles.loadMoreLabel}
                icon="chevron-down"
              >
                Charger plus ({itemsInViewport.length - displayedItems.length} restants)
              </Button>
            ) : null
          }
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
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
  loadingContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : (StatusBar.currentHeight || 0) + 80,
    alignSelf: 'center',
    zIndex: 1000,
  },
  loadingIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
  },
  loadingSpinner: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
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
  // Indicateur de chargement discret
  loadingIndicatorCompact: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : (StatusBar.currentHeight || 0) + 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  loadingTextCompact: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 13,
  },
  // Styles pour les états vides
  emptyStateContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 16,
  },
  emptyStateIcon: {
    backgroundColor: '#F1F5F9',
  },
  emptyStateTitle: {
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateText: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Styles pour le loading
  calculatingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 16,
  },
  calculatingText: {
    color: '#6366F1',
    fontWeight: '500',
  },
  // Styles pour le bouton "Charger plus"
  loadMoreButton: {
    marginTop: 16,
    marginBottom: 20,
    borderColor: '#6366F1',
    borderWidth: 2,
    borderRadius: 12,
  },
  loadMoreLabel: {
    color: '#6366F1',
    fontWeight: '600',
  },
});
