import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Platform, StatusBar, Linking, Alert } from 'react-native';
import { Card, Text, Searchbar, Surface, Avatar, Chip, Button, Divider } from 'react-native-paper';
import mockEventsData from '../../mockEventsData.json';
import { Event } from '../../types';

const allEvents: Event[] = mockEventsData.data.events as Event[];




export default function EventsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Toggle l'état d'une carte
  const toggleCard = (eventId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

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

  // Filtrer les événements par ville
  const filteredEvents = useMemo(() => {
    if (searchQuery === '') {
      return allEvents;
    }

    const searchLower = searchQuery.toLowerCase().trim();
    return allEvents.filter(event =>
      event.city.toLowerCase().includes(searchLower) ||
      event.title.toLowerCase().includes(searchLower) ||
      event.description.toLowerCase().includes(searchLower) ||
      event.churchName.toLowerCase().includes(searchLower)
    );
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      {/* En-tête avec compteur */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Avatar.Icon
              icon="calendar-star"
              size={40}
              style={styles.headerAvatar}
            />
            <View style={styles.headerTextContainer}>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                Tous les événements
              </Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                {filteredEvents.length} événement(s) {searchQuery ? 'trouvé(s)' : 'disponible(s)'}
              </Text>
            </View>
          </View>

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
        </View>
      </Surface>

      {/* Liste des événements */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card
              key={event.id}
              style={styles.eventCard}
              mode="elevated"
              elevation={2}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Avatar.Icon
                    icon="calendar-star"
                    size={48}
                    style={styles.eventAvatar}
                  />
                  <View style={styles.cardHeaderText}>
                    <Text variant="titleLarge" style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <View style={styles.locationContainer}>
                      <Avatar.Icon
                        icon="map-marker"
                        size={16}
                        style={styles.locationIcon}
                      />
                      <Text variant="bodySmall" style={styles.locationText}>
                        {event.city}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.dateContainer}>
                  <Chip
                    icon="calendar"
                    style={styles.dateChip}
                    textStyle={styles.dateChipText}
                  >
                    {formatDate(event.date)}
                  </Chip>
                  <Chip
                    icon="clock-outline"
                    style={styles.timeChip}
                    textStyle={styles.timeChipText}
                  >
                    {event.startTime} - {event.endTime}
                  </Chip>
                </View>

                {expandedCards[event.id] && (
                  <>
                    <Divider style={styles.divider} />

                    <View style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <Avatar.Icon icon="map-marker" size={24} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                          <Text variant="labelSmall" style={styles.infoLabel}>Lieu</Text>
                          <Text variant="bodyMedium" style={styles.infoText}>
                            {event.address}
                          </Text>
                          <Text variant="bodySmall" style={styles.infoSubtext}>
                            {event.city}, {event.country}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Avatar.Icon icon="church" size={24} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                          <Text variant="labelSmall" style={styles.infoLabel}>Église organisatrice</Text>
                          <Text variant="bodyMedium" style={styles.infoText}>
                            {event.churchName}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Avatar.Icon icon="account" size={24} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                          <Text variant="labelSmall" style={styles.infoLabel}>Organisateur</Text>
                          <Text variant="bodyMedium" style={styles.infoText}>
                            {event.organizer}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Avatar.Icon icon="information" size={24} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                          <Text variant="labelSmall" style={styles.infoLabel}>Description</Text>
                          <Text variant="bodyMedium" style={styles.infoText}>
                            {event.description}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Avatar.Icon icon="email" size={24} style={styles.infoIcon} />
                        <View style={styles.infoTextContainer}>
                          <Text variant="labelSmall" style={styles.infoLabel}>Contact</Text>
                          <Text variant="bodySmall" style={styles.infoText}>
                            {event.email}
                          </Text>
                          <Text variant="bodySmall" style={styles.infoText}>
                            {event.phone}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.actionButtons}>
                      <Button
                        mode="contained"
                        icon="phone"
                        style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                        labelStyle={styles.actionButtonLabel}
                        onPress={() => Linking.openURL(`tel:${event.phone}`)}
                      >
                        Appeler
                      </Button>
                      <Button
                        mode="contained"
                        icon="whatsapp"
                        style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                        labelStyle={styles.actionButtonLabel}
                        onPress={() => Linking.openURL(event.whatsapp)}
                      >
                        WhatsApp
                      </Button>
                      <Button
                        mode="contained"
                        icon="directions"
                        style={[styles.actionButton, { backgroundColor: '#6366F1' }]}
                        labelStyle={styles.actionButtonLabel}
                        onPress={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
                          Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps'));
                        }}
                      >
                        Itinéraire
                      </Button>
                    </View>
                  </>
                )}

                <Button
                  mode="text"
                  icon={expandedCards[event.id] ? "chevron-up" : "chevron-down"}
                  onPress={() => toggleCard(event.id)}
                  style={styles.toggleButton}
                  labelStyle={styles.toggleButtonLabel}
                >
                  {expandedCards[event.id] ? 'Voir moins' : 'Voir plus de détails'}
                </Button>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Avatar.Icon
              icon="calendar-remove"
              size={80}
              style={styles.emptyIcon}
            />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              Aucun événement trouvé
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Essayez de rechercher une autre ville
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
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    gap: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    backgroundColor: '#10B981',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  searchBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    elevation: 0,
  },
  searchInput: {
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  eventAvatar: {
    backgroundColor: '#10B981',
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    backgroundColor: 'transparent',
  },
  locationText: {
    color: '#64748B',
    fontSize: 13,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateChip: {
    backgroundColor: '#EEF2FF',
  },
  dateChipText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  timeChip: {
    backgroundColor: '#F0FDF4',
  },
  timeChipText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#E2E8F0',
  },
  infoSection: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    backgroundColor: '#F1F5F9',
  },
  infoTextContainer: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    color: '#1E293B',
    lineHeight: 20,
  },
  infoSubtext: {
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  toggleButton: {
    marginTop: 8,
  },
  toggleButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyIcon: {
    backgroundColor: '#F1F5F9',
  },
  emptyTitle: {
    color: '#1E293B',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
  },
});