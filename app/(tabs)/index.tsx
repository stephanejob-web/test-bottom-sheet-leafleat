import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Platform, Alert, ScrollView, Linking, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Card, Text, Searchbar, Button, Surface, Chip, IconButton, Avatar, Divider, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import mockApiResponse from '../../mockApiData.json';
import mockEventsData from '../../mockEventsData.json';
import { Church, ChurchWithDistance, Event } from '../../types';
import { calculateDistance } from '../../utils/geo';
import { cityCoordinates } from '../../constants/cities';

// Chargement des données depuis le mock API
const allChurches: Church[] = mockApiResponse.data.churches as Church[];
const allEvents: Event[] = mockEventsData.data.events as Event[];

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
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [focusedChurchIndex, setFocusedChurchIndex] = useState<number>(0);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [churchForDirections, setChurchForDirections] = useState<Church | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const snapPoints = useMemo(() => ['25%', '50%', '85%'], []);

  // Détecter la recherche de ville et centrer la carte
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

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }, 1000);
      }
    }
  }, [searchQuery]);

  // Détermine si on utilise la position actuelle de l'utilisateur
  const isUsingCurrentLocation = useMemo(() => {
    return searchCenter === null && location !== null;
  }, [searchCenter, location]);

  // Filtrer les églises avec distance
  const filteredChurchesWithDistance = useMemo((): ChurchWithDistance[] => {
    const center = searchCenter || (location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : null);

    if (!center) {
      return allChurches.slice(0, 10).map(church => ({ ...church, distance: 0 }));
    }

    return allChurches
      .map((church) => {
        const distance = calculateDistance(
          center.latitude,
          center.longitude,
          church.latitude,
          church.longitude
        );

        const matchesSearch = searchQuery === '' ||
          church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          church.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          church.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        return { ...church, distance, matchesSearch };
      })
      .filter(({ matchesSearch }) => matchesSearch)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
  }, [location, searchCenter, searchQuery]);

  const handleMarkerPress = useCallback((church: Church) => {
    setSelectedChurch(church);
    bottomSheetRef.current?.snapToIndex(2);
  }, []);

  const handleDirections = useCallback((church: Church) => {
    setChurchForDirections(church);
    setShowMapDialog(true);
  }, []);

  const openInGoogleMaps = useCallback((church: Church) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${church.latitude},${church.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps'));
    setShowMapDialog(false);
  }, []);

  const openInAppleMaps = useCallback((church: Church) => {
    const url = `http://maps.apple.com/?daddr=${church.latitude},${church.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Plans'));
    setShowMapDialog(false);
  }, []);

  const openInWaze = useCallback((church: Church) => {
    const url = `https://waze.com/ul?ll=${church.latitude},${church.longitude}&navigate=yes`;
    Linking.canOpenURL('waze://').then(supported => {
      if (supported) {
        Linking.openURL(`waze://?ll=${church.latitude},${church.longitude}&navigate=yes`);
      } else {
        Linking.openURL(url);
      }
    }).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Waze'));
    setShowMapDialog(false);
  }, []);

  const animateToChurch = useCallback((church: Church) => {
    mapRef.current?.animateToRegion({
      latitude: church.latitude,
      longitude: church.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 1000);
  }, []);

  // Fonction pour recentrer sur la position de l'utilisateur
  const recenterOnUser = useCallback(async () => {
    try {
      if (location) {
        // Si on a déjà la position, on l'utilise
        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
        setSearchCenter(null); // Réinitialise la recherche de ville
        setSearchQuery(''); // Efface la recherche
      } else {
        // Sinon, on récupère la position actuelle
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
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position');
    }
  }, [location]);

  const handleScroll = useCallback((event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = 320 + 16;
    const index = Math.round(scrollPosition / cardWidth);

    if (index >= 0 && index < filteredChurchesWithDistance.length && index !== focusedChurchIndex) {
      setFocusedChurchIndex(index);
      animateToChurch(filteredChurchesWithDistance[index]);
    }
  }, [focusedChurchIndex, animateToChurch, filteredChurchesWithDistance]);

  // Géolocalisation
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Géolocalisation désactivée',
            'Les églises seront affichées autour de Paris.'
          );
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);

        if (mapRef.current) {
          setTimeout(() => {
            mapRef.current?.animateToRegion({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }, 1500);
          }, 1000);
        }
      } catch (error) {
        Alert.alert(
          'Erreur de géolocalisation',
          'Les églises seront affichées autour de Paris.'
        );
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
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

        {filteredChurchesWithDistance.map((church, index) => (
          <Marker
            key={church.id}
            coordinate={{
              latitude: church.latitude,
              longitude: church.longitude,
            }}
            title={church.name}
            description={church.address}
            onPress={() => handleMarkerPress(church)}
          >
            <ChurchMarkerIcon focused={focusedChurchIndex === index} />
          </Marker>
        ))}

        {allEvents.map((event) => (
          <Marker
            key={`event-${event.id}`}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            title={event.title}
            description={event.city}
          >
            <EventMarkerIcon focused={false} />
          </Marker>
        ))}
      </MapView>

      {/* Barre de recherche toujours visible */}
      <Surface style={styles.searchSection} elevation={5}>
        <Searchbar
          placeholder="Rechercher une église ou une ville..."
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

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {/* Header amélioré */}
        <View style={styles.bottomSheetHeader}>
          <View style={styles.headerTop}>
            <Avatar.Icon
              icon={selectedChurch ? "church" : "map-marker-multiple"}
              size={40}
              style={styles.headerAvatar}
            />
            <View style={styles.headerTextContainer}>
              <Text variant="headlineSmall" style={styles.bottomSheetTitle}>
                {selectedChurch ? selectedChurch.name : 'Églises à proximité'}
              </Text>
              {!selectedChurch && (
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  {filteredChurchesWithDistance.length} église(s) trouvée(s)
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Contenu */}
        <BottomSheetScrollView style={styles.bottomSheetContent}>
          {selectedChurch ? (
            // Vue détaillée moderne
            <View style={styles.detailsContainerModern}>
              {/* Header avec gradient et nom */}
              <View style={styles.detailHeaderModern}>
                <IconButton
                  icon="arrow-left"
                  size={24}
                  iconColor="white"
                  onPress={() => setSelectedChurch(null)}
                  style={styles.detailBackButton}
                />
                <View style={styles.detailHeaderContent}>
                  <Text variant="headlineMedium" style={styles.detailChurchName}>
                    {selectedChurch.name}
                  </Text>
                  {isUsingCurrentLocation && (
                    <View style={styles.detailDistanceBadge}>
                      <Text style={styles.detailDistanceText}>
                        {filteredChurchesWithDistance.find(c => c.id === selectedChurch.id)?.distance.toFixed(1) || '0.0'} km
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Actions rapides */}
              <View style={styles.quickActionsContainer}>
                <Button
                  mode="contained"
                  icon="phone"
                  style={styles.quickActionButton}
                  labelStyle={styles.quickActionLabel}
                  onPress={() => Linking.openURL(`tel:${selectedChurch.phone}`)}
                >
                  Appeler
                </Button>
                <Button
                  mode="contained"
                  icon="email"
                  style={styles.quickActionButton}
                  labelStyle={styles.quickActionLabel}
                  onPress={() => Linking.openURL(`mailto:${selectedChurch.email}`)}
                >
                  Email
                </Button>
                <Button
                  mode="contained"
                  icon="directions"
                  style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
                  labelStyle={styles.quickActionLabel}
                  onPress={() => handleDirections(selectedChurch)}
                >
                  Itinéraire
                </Button>
              </View>

              {/* Description */}
              <Card mode="outlined" style={styles.detailCard}>
                <Card.Content>
                  <View style={styles.detailCardHeader}>
                    <Avatar.Icon icon="information" size={32} style={styles.detailCardIcon} />
                    <Text variant="titleMedium" style={styles.detailCardTitle}>À propos</Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.detailCardText}>
                    {selectedChurch.description}
                  </Text>
                </Card.Content>
              </Card>

              {/* Adresse */}
              <Card mode="outlined" style={styles.detailCard}>
                <Card.Content>
                  <View style={styles.detailCardHeader}>
                    <Avatar.Icon icon="map-marker" size={32} style={styles.detailCardIcon} />
                    <Text variant="titleMedium" style={styles.detailCardTitle}>Adresse</Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.detailCardText}>
                    {selectedChurch.address}
                  </Text>
                </Card.Content>
              </Card>

              {/* Responsable */}
              <Card mode="outlined" style={styles.detailCard}>
                <Card.Content>
                  <View style={styles.detailCardHeader}>
                    <Avatar.Icon icon="account-tie" size={32} style={styles.detailCardIcon} />
                    <View style={styles.detailCardHeaderText}>
                      <Text variant="labelSmall" style={styles.detailCardLabel}>Pasteur</Text>
                      <Text variant="titleMedium" style={styles.detailCardTitle}>{selectedChurch.pastor}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* Contact */}
              <Card mode="outlined" style={styles.detailCard}>
                <Card.Content>
                  <View style={styles.detailCardHeader}>
                    <Avatar.Icon icon="phone" size={32} style={styles.detailCardIcon} />
                    <Text variant="titleMedium" style={styles.detailCardTitle}>Contact</Text>
                  </View>
                  <View style={styles.contactInfoContainer}>
                    <View style={styles.contactInfoRow}>
                      <Text variant="bodyMedium" style={styles.contactInfoLabel}>Téléphone :</Text>
                      <Text variant="bodyMedium" style={styles.contactInfoValue}>{selectedChurch.phone}</Text>
                    </View>
                    <View style={styles.contactInfoRow}>
                      <Text variant="bodyMedium" style={styles.contactInfoLabel}>Email :</Text>
                      <Text variant="bodyMedium" style={styles.contactInfoValue}>{selectedChurch.email}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* Horaires */}
              <Card mode="outlined" style={styles.detailCard}>
                <Card.Content>
                  <View style={styles.detailCardHeader}>
                    <Avatar.Icon icon="calendar-clock" size={32} style={styles.detailCardIcon} />
                    <Text variant="titleMedium" style={styles.detailCardTitle}>Horaires des cultes</Text>
                  </View>
                  <View style={styles.servicesContainer}>
                    {selectedChurch.services.map((service, index) => (
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
            // Liste verticale style Google Maps
            <View style={styles.churchListVertical}>
              {filteredChurchesWithDistance.map((church, index) => (
                <Card
                  key={church.id}
                  style={[
                    styles.churchCardCompact,
                    focusedChurchIndex === index && styles.churchCardCompactFocused,
                  ]}
                  onPress={() => {
                    setFocusedChurchIndex(index);
                    animateToChurch(church);
                  }}
                  mode="elevated"
                  elevation={focusedChurchIndex === index ? 4 : 1}
                >
                  <View style={styles.cardCompactContent}>
                    {/* Icône et infos principales */}
                    <View style={styles.cardCompactMain}>
                      <Avatar.Icon
                        icon="church"
                        size={48}
                        style={[
                          styles.cardCompactAvatar,
                          focusedChurchIndex === index && styles.cardCompactAvatarFocused,
                        ]}
                      />

                      <View style={styles.cardCompactInfo}>
                        <Text
                          variant="titleMedium"
                          style={styles.cardCompactTitle}
                          numberOfLines={1}
                        >
                          {church.name}
                        </Text>

                        {isUsingCurrentLocation && (
                          <View style={styles.cardCompactMeta}>
                            <View style={styles.distanceBadge}>
                              <Text style={styles.distanceBadgeText}>
                                {church.distance.toFixed(1)} km
                              </Text>
                            </View>
                          </View>
                        )}

                        <Text
                          variant="bodySmall"
                          style={styles.cardCompactAddress}
                          numberOfLines={2}
                        >
                          {church.address}
                        </Text>
                      </View>
                    </View>

                    {/* Actions rapides */}
                    <View style={styles.cardCompactActions}>
                      <IconButton
                        icon="information-outline"
                        size={20}
                        iconColor="#6366F1"
                        containerColor="#EEF2FF"
                        onPress={() => handleMarkerPress(church)}
                        style={styles.cardCompactActionButton}
                      />
                      <Button
                        mode="contained"
                        icon="directions"
                        compact
                        onPress={() => handleDirections(church)}
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
              Vers <Text style={styles.churchName}>{churchForDirections?.name}</Text>
            </Text>
            <Divider style={styles.dialogDivider} />
            <Text variant="labelSmall" style={styles.dialogLabel}>CHOISISSEZ VOTRE APPLICATION :</Text>

            <View style={styles.navigationApps}>
              <Card mode="outlined" style={styles.appCard} onPress={() => churchForDirections && openInGoogleMaps(churchForDirections)}>
                <Card.Content style={styles.appCardContent}>
                  <Avatar.Icon icon="google-maps" size={48} style={styles.googleMapsIcon} />
                  <Text variant="titleMedium" style={styles.appName}>Google Maps</Text>
                </Card.Content>
              </Card>

              {Platform.OS === 'ios' && (
                <Card mode="outlined" style={styles.appCard} onPress={() => churchForDirections && openInAppleMaps(churchForDirections)}>
                  <Card.Content style={styles.appCardContent}>
                    <Avatar.Icon icon="map" size={48} style={styles.appleMapsIcon} />
                    <Text variant="titleMedium" style={styles.appName}>Plans</Text>
                  </Card.Content>
                </Card>
              )}

              <Card mode="outlined" style={styles.appCard} onPress={() => churchForDirections && openInWaze(churchForDirections)}>
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
  // Section de recherche améliorée
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
  suggestionsScroll: {
    marginTop: 12,
  },
  suggestionsContainer: {
    gap: 8,
    paddingHorizontal: 4,
  },
  suggestionChip: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  suggestionChipText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  // Bottom Sheet amélioré avec très forte transparence
  bottomSheetBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // 60% opacité - effet glass très prononcé
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
    borderBottomColor: 'rgba(241, 245, 249, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // 50% opacité - header semi-transparent
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
  bottomSheetContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  // Liste des églises améliorée
  churchList: {
    marginTop: 8,
  },
  churchListContent: {
    paddingLeft: 20,
    paddingRight: 100,
  },
  churchCard: {
    width: 320,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  churchCardFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
    transform: [{ scale: 1.02 }],
  },
  cardAvatar: {
    backgroundColor: '#6366F1',
  },
  distanceChip: {
    backgroundColor: '#FEF3C7',
    marginRight: 8,
  },
  cardBody: {
    paddingTop: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    backgroundColor: '#EEF2FF',
  },
  infoTextContainer: {
    flex: 1,
  },
  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  paginationDotActive: {
    width: 28,
    backgroundColor: '#6366F1',
  },
  // Vue détaillée
  detailsContainer: {
    gap: 16,
    paddingTop: 8,
  },
  detailMainCard: {
    marginBottom: 8,
    borderRadius: 16,
  },
  detailSection: {
    paddingVertical: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailAvatar: {
    backgroundColor: '#EEF2FF',
  },
  detailSectionTitle: {
    flex: 1,
    textTransform: 'uppercase',
    color: '#64748B',
    fontWeight: '700',
  },
  detailSectionText: {
    marginLeft: 48,
    lineHeight: 22,
    color: '#334155',
  },
  detailDivider: {
    marginVertical: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 48,
    marginTop: 8,
  },
  serviceChipDetail: {
    backgroundColor: '#EEF2FF',
  },
  contactContainer: {
    marginLeft: 48,
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  directionsButton: {
    flex: 1,
    backgroundColor: '#6366F1',
  },
  // Dialog
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
  // Liste verticale style Google Maps
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
  cardCompactDistanceChip: {
    backgroundColor: '#FEF3C7',
    height: 24,
  },
  cardCompactDistanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
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
  // Badge de distance personnalisé
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
  // Bouton de recentrage GPS
  recenterButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : (StatusBar.currentHeight || 0) + 90,
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
  // Vue détaillée moderne
  detailsContainerModern: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailHeaderModern: {
    backgroundColor: '#6366F1',
    marginHorizontal: -16,
    marginTop: -16,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  detailBackButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailHeaderContent: {
    marginTop: 40,
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
  // Actions rapides
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  quickActionButtonPrimary: {
    backgroundColor: '#6366F1',
  },
  quickActionLabel: {
    fontSize: 12,
  },
  // Cards détail
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
  // Contact info
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
  // Services
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
  // Marker personnalisé avec icône de colombe
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
  // Marker de position utilisateur - Style Google Maps
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
  // Marker personnalisé pour les événements (vert pour les différencier)
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
});