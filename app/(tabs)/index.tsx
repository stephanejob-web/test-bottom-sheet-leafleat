import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Calendar from 'expo-calendar';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StatusBar, StyleSheet, View } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Avatar, Button, Card, Dialog, Divider, IconButton, Portal, Searchbar, Surface, Text } from 'react-native-paper';
import { eventTypeConfig } from '../../constants/eventTypes';
import { useDebounce } from '../../hooks/use-debounce';
import mockApiResponse from '../../mockApiData.json';
import mockEventsData from '../../mockEventsData.json';
import { Church, ChurchWithDistance, Event, EventWithDistance } from '../../types';
import * as GeoUtils from '../../utils/geo';
import ChurchDetail from '../components/ChurchDetail';
import EventDetail from '../components/EventDetail';
import ListItemCard from '../components/ListItemCard';
import MapMarkerItem from '../components/MapMarkerItem';

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
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [distanceCache, setDistanceCache] = useState<Map<string, number>>(new Map());

  // État pour contrôler l'affichage de la liste
  // La liste ne s'affiche que si l'utilisateur a cliqué sur un cluster ou effectue une recherche
  const [isListActive, setIsListActive] = useState(false);
  // Items forcés (ex: issus d'un clic cluster pour une précision 100%)
  const [manualItems, setManualItems] = useState<ListItem[] | null>(null);

  // États pour les filtres avancés
  const [filterType, setFilterType] = useState<'all' | 'church' | 'event'>('all');
  const [filterParking, setFilterParking] = useState(false);

  // ... (existing states) ...
  const mapRef = useRef<any>(null); // ClusteredMapView type
  const isClusterZooming = useRef(false);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['25%', '50%', '95%'], []);

  // Débouncer la recherche pour éviter les re-renders excessifs
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Débouncer la région visible pour optimiser les performances pendant le pan/zoom
  const debouncedVisibleRegion = useDebounce(visibleRegion, 400);

  // Détection du niveau de zoom (Est-ce qu'on voit la France entière ?)
  const isZoomedOut = debouncedVisibleRegion ? debouncedVisibleRegion.latitudeDelta > 1.5 : false;
  // Pagination fixe à 20 pour éviter de surcharger l'application
  const dynamicItemsPerPage = 20;

  // ... (keep existing effects) ...

  // Map markers - Filtrage optimisé avec les nouveaux filtres
  const mapMarkers = useMemo((): ListItem[] => {
    let churchesFiltered: ListItem[] = [];
    let eventsFiltered: ListItem[] = [];

    // 1. Filtrer les Églises
    if (filterType === 'all' || filterType === 'church') {
      churchesFiltered = allChurches
        .filter((church) => {
          // Filtre Recherche Texte
          const matchesSearch = searchQuery === '' ||
            church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            church.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            church.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

          // Filtre Parking
          const matchesParking = !filterParking || church.parking === true;

          return matchesSearch && matchesParking;
        })
        .map(church => ({ ...church, distance: 0, itemType: 'church' as const }));
    }

    // 2. Filtrer les Événements
    if (filterType === 'all' || filterType === 'event') {
      // Note: Les événements sont toujours affichés si on ne filtre pas par parking (ou si logique parking événement ajoutée)
      // Pour l'instant on assume que "Parking" ne filtre que les églises ou les événements liés à une église avec parking (à implémenter si donnée dispo)
      // Ici on simplifie : si filtre parking actif, on cache les événements (sauf si on ajoutait la donnée parking aux events)
      // Pour UX : On pourrait dire que le filtre parking ne s'applique qu'aux églises.

      const shouldShowEvents = !filterParking; // Exemple: on cache les events si on cherche un parking spécifique (sauf si event a parking)

      if (shouldShowEvents) {
        eventsFiltered = allEvents
          .filter((event) => {
            const matchesSearch = searchQuery === '' ||
              event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
              event.churchName.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
          })
          .map(event => ({ ...event, distance: 0, itemType: 'event' as const }));
      }
    }

    return [...churchesFiltered, ...eventsFiltered];
  }, [searchQuery, filterType, filterParking]);

  // Items dans le RAYON VISUEL (Cercle au centre)
  // Optimisation: On ne prend que ce qui est dans le cercle affiché
  const itemsInViewportMemo = useMemo((): ListItem[] => {
    // 0. Priorité absolue : Items manuels (clic cluster)
    if (manualItems) return manualItems;

    // Si la liste n'est pas activée (pas de clic cluster ni recherche), on ne retourne rien
    if (!debouncedVisibleRegion || !isListActive) return [];

    // 1. Si Dézoomé (Vue France) -> On retourne TOUT (sans filtre rayon)
    if (isZoomedOut) {
      return mapMarkers;
    }

    // 2. Si Zoomé (Exploration Locale) -> On affiche TOUT ce qui est visible sur la carte (Bounding Box)
    // Cela garantit que "Ce que je vois = Ce que j'ai dans la liste"
    const { latitude, longitude, latitudeDelta, longitudeDelta } = debouncedVisibleRegion;

    // Calcul des bornes de l'écran
    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;

    return mapMarkers.filter(item =>
      item.latitude >= minLat && item.latitude <= maxLat &&
      item.longitude >= minLng && item.longitude <= maxLng
    );
  }, [mapMarkers, debouncedVisibleRegion, isListActive, manualItems, isZoomedOut]);

  // Synchroniser itemsInViewport
  useEffect(() => {
    setItemsInViewport(itemsInViewportMemo);
  }, [itemsInViewportMemo]);

  // Reset validation lors du changement de recherche et gestion du centrage
  useEffect(() => {
    if (searchQuery !== '') {
      setValidatedRegion(null);
    }
  }, [searchQuery]);
  // Gestion de la recherche et du centrage
  useEffect(() => {
    if (!debouncedSearchQuery) return; // Ne rien faire si recherche vide

    const hasMatchingItems = mapMarkers.length > 0;

    const performSearch = async () => {
      setIsListActive(true); // Activer la liste lors d'une recherche
      // 1. Si on a des items correspondants, on centre sur eux (bounding box)
      if (hasMatchingItems && mapRef.current) {
        // Calculer la bounding box des résultats
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        mapMarkers.forEach(m => {
          minLat = Math.min(minLat, m.latitude);
          maxLat = Math.max(maxLat, m.latitude);
          minLng = Math.min(minLng, m.longitude);
          maxLng = Math.max(maxLng, m.longitude);
        });

        // Ajouter une marge
        const latDelta = (maxLat - minLat) * 1.5;
        const lngDelta = (maxLng - minLng) * 1.5;

        mapRef.current.animateToRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max(latDelta, 0.05), // Min delta pour éviter zoom extrême
          longitudeDelta: Math.max(lngDelta, 0.05),
        }, 1000);
      }
      // 2. Si AUCUN item trouvé, on essaie de géocoder le texte (ex: "Paris", "Lyon")
      else if (!hasMatchingItems && debouncedSearchQuery.length > 2) {
        try {
          const geocodedLocation = await Location.geocodeAsync(debouncedSearchQuery);
          if (geocodedLocation && geocodedLocation.length > 0) {
            const { latitude, longitude } = geocodedLocation[0];
            mapRef.current?.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.1, // Zoom niveau ville
              longitudeDelta: 0.1,
            }, 1000);
          }
        } catch (error) {
          console.log("Erreur de géocodage:", error);
        }
      }

      // Reset UI states
      setValidatedRegion(null);
      setDisplayedItems([]); // On laisse le filtrage viewport repeupler
      setCurrentPage(0);
    };

    performSearch();

  }, [debouncedSearchQuery, mapMarkers]);

  // Détermine si on utilise la position actuelle de l'utilisateur
  const isUsingCurrentLocation = useMemo(() => {
    return searchCenter === null && location !== null;
  }, [searchCenter, location]);

  // Clear cache si trop gros
  useEffect(() => {
    if (distanceCache.size > 500) {
      setDistanceCache(new Map());
    }
  }, [searchCenter, location, distanceCache]);

  // Compteurs séparés pour églises et événements (basés sur itemsInViewport = TOTAL)
  const churchCount = useMemo(() =>
    itemsInViewport.filter(item => item.itemType === 'church').length,
    [itemsInViewport]
  );

  const eventCount = useMemo(() =>
    itemsInViewport.filter(item => item.itemType === 'event').length,
    [itemsInViewport]
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

    // GESTION INTELLIGENTE: Si on a des items manuels (cluster), on vérifie si on doit les garder
    if (manualItems) {
      if (isClusterZooming.current) {
        // C'est le zoom automatique du cluster -> On garde la liste précise
        isClusterZooming.current = false;
      } else {
        // L'utilisateur a bougé la carte manuellement ensuite -> On repasse en mode "Exploration" (cercle)
        setManualItems(null);
      }
    }

    setIsCalculatingDistances(true);
    setValidatedRegion(debouncedVisibleRegion);
    setCurrentPage(0);

    // Obtenir le centre pour le calcul de distance
    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : debouncedVisibleRegion);

    // Calculer distance UNIQUEMENT pour les X premiers items
    const itemsToCalculate = itemsInViewport.slice(0, dynamicItemsPerPage);
    const cacheKeyPrefix = `${center.latitude.toFixed(3)}-${center.longitude.toFixed(3)}`;

    const itemsWithDistance = GeoUtils.calculateDistancesForItems(
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
  }, [debouncedVisibleRegion, itemsInViewport, searchCenter, location, distanceCache, validatedRegion, dynamicItemsPerPage]);

  // Handler pour pagination ("Charger plus")
  const handleLoadMore = useCallback(() => {
    if (!validatedRegion || isCalculatingDistances) return;

    const nextPage = currentPage + 1;
    const startIdx = nextPage * dynamicItemsPerPage;
    const endIdx = startIdx + dynamicItemsPerPage;
    const nextBatch = itemsInViewport.slice(startIdx, endIdx);

    if (nextBatch.length === 0) return;

    setIsCalculatingDistances(true);

    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : validatedRegion);

    const cacheKeyPrefix = `${center.latitude.toFixed(3)}-${center.longitude.toFixed(3)}`;

    const batchWithDistance = GeoUtils.calculateDistancesForItems(
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
    setIsListActive(true); // Activer la liste dès que la carte bouge (zoom ou pan)
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

  // Custom cluster renderer avec niveaux de regroupement visuels
  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const points = properties.point_count;

    // Déterminer la taille et couleur selon le nombre de points
    let size = 50;
    let backgroundColor = '#6366F1'; // Bleu par défaut (1-10)
    let fontSize = 14;

    if (points > 500) {
      size = 80;
      backgroundColor = '#DC2626'; // Rouge foncé (500+)
      fontSize = 20;
    } else if (points > 100) {
      size = 70;
      backgroundColor = '#EF4444'; // Rouge (100-500)
      fontSize = 18;
    } else if (points > 50) {
      size = 60;
      backgroundColor = '#EC4899'; // Rose (50-100)
      fontSize = 16;
    } else if (points > 20) {
      size = 55;
      backgroundColor = '#8B5CF6'; // Violet (20-50)
      fontSize = 15;
    } else if (points > 10) {
      size = 52;
      backgroundColor = '#6366F1'; // Bleu (10-20)
      fontSize = 14;
    }

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
        onPress={onPress}
        tracksViewChanges={false}
      >
        <View style={[styles.clusterContainer, { width: size + 10, height: size + 10 }]}>
          <View style={[
            styles.clusterInner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor
            }
          ]}>
            <Text style={[styles.clusterText, { fontSize }]}>{points}</Text>
          </View>
        </View>
      </Marker>
    );
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
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChangeComplete={handleRegionChangeComplete}

        // Activation de la liste et Zoom manuel au clic sur un cluster
        onClusterPress={(cluster) => {
          setIsListActive(true);

          // AMÉLIORATION: Calculer les items EXACTS dans le cluster pour correspondance parfaite
          if (cluster.coordinate && cluster.properties?.point_count) {
            const clusterLat = cluster.coordinate.latitude;
            const clusterLng = cluster.coordinate.longitude;

            // Calculer un rayon adaptatif basé sur le nombre de points dans le cluster
            // Plus il y a de points, plus le rayon doit être grand pour les capturer tous
            const pointCount = cluster.properties.point_count;
            let radiusKm = 0.5; // Rayon par défaut: 500m

            if (pointCount > 200) {
              radiusKm = 5; // 5km pour très gros clusters
            } else if (pointCount > 100) {
              radiusKm = 3; // 3km pour gros clusters
            } else if (pointCount > 50) {
              radiusKm = 2; // 2km pour clusters moyens
            } else if (pointCount > 20) {
              radiusKm = 1; // 1km pour petits clusters
            } else if (pointCount > 10) {
              radiusKm = 0.8; // 800m pour très petits clusters
            }

            // Filtrer TOUS les markers dans ce rayon (pas juste itemsInViewport)
            const clusterItems = GeoUtils.filterItemsByRadius(
              mapMarkers, // Utiliser TOUS les markers pour être sûr
              clusterLat,
              clusterLng,
              radiusKm
            );

            // Forcer ces items dans la liste (correspondance parfaite avec le cluster)
            setManualItems(clusterItems);
            isClusterZooming.current = true;
          }

          // On force le zoom car définir onClusterPress écrase le comportement par défaut
          if (mapRef.current && cluster.coordinate) {
            // Zoom x4 pour éclater le cluster
            const currentLatDelta = visibleRegion?.latitudeDelta ?? 0.09;
            const currentLngDelta = visibleRegion?.longitudeDelta ?? 0.09;

            mapRef.current.animateToRegion({
              latitude: cluster.coordinate.latitude,
              longitude: cluster.coordinate.longitude,
              latitudeDelta: currentLatDelta / 4,
              longitudeDelta: currentLngDelta / 4,
            }, 500);
          }
        }}
        // Configuration comme la DEMO (https://github.com/venits/react-native-map-clustering)
        renderCluster={renderCluster}
        radius={60} // Réduit pour voir les markers plus tôt (était 110)
        maxZoom={20}
        minZoom={1}
        minPoints={2} // Réduit au minimum pour voir les markers dès que possible
        extent={512}
        nodeSize={64}
        clusteringEnabled={true}
        preserveClusterPressBehavior={true}
        animationEnabled={true} // ACTIVE pour l'effet "Wow" de la démo
        layoutAnimationConf={{
          duration: 300 // Durée fluide standard
        }}
        spiralEnabled={true} // ACTIVE pour l'éclatement des clusters denses
      >



        {/* OPTIMISATION MAJEURE: On passe TOUS les markers filtrés par recherche
            au lieu des markers dans le viewport. Le clustering natif gérera l'affichage.
            Cela empêche le clignotement/re-render à chaque mouvement de carte. */}
        {mapMarkers.map((item, index) => (
          <MapMarkerItem
            key={`${item.itemType}-${item.id}`}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            item={item}
            index={index}
            focused={focusedItemIndex === index}
            onPress={handleItemPress}
          />
        ))}
      </ClusteredMapView>



      {/* Barre de recherche sans filtres */}
      <View style={styles.searchContainerHeader}>
        <Surface style={styles.searchSection} elevation={5}>
          <Searchbar
            placeholder="Rechercher..."
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
      </View>

      {/* Indicateur de chargement discret */}
      {
        isCalculatingDistances && (
          <Surface style={styles.loadingIndicatorCompact} elevation={2}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text variant="bodySmall" style={styles.loadingTextCompact}>
              Actualisation...
            </Text>
          </Surface>
        )
      }

      {/* Bouton de recentrage sur la position */}
      <Surface style={styles.recenterButton} elevation={4}>
        <IconButton
          icon="crosshairs-gps"
          size={24}
          iconColor="#6366F1"
          onPress={recenterOnUser}
        />
      </Surface>

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
          renderItem={({ item, index }: { item: ListItem; index: number }) => (
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
    </View >
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
  searchContainerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 12,
  },
  searchSection: {
    borderRadius: 25, // Plus rond pour le style "Pill"
    backgroundColor: 'white',
    height: 50,
  },
  searchBar: {
    backgroundColor: 'white',
    borderRadius: 25,
    height: 50,
    elevation: 0, // Désactiver l'ombre interne car on a celle de la Surface
  },
  searchInput: {
    minHeight: 0, // Fix pour centrer le texte sur Android
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: 'white',
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterChipSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: 'white',
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
  // Styles pour les clusters personnalisés avec tailles dynamiques
  clusterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterInner: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  clusterText: {
    color: 'white',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
