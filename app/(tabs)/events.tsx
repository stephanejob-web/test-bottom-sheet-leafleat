import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Platform, StatusBar } from 'react-native';
import { Card, Text, Searchbar, Surface, Avatar, Chip } from 'react-native-paper';
import mockEventsData from '../../mockEventsData.json';
import { Event } from '../../types';

const allEvents: Event[] = mockEventsData.data.events as Event[];

export default function EventsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

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
                    <Text variant="titleMedium" style={styles.eventTitle} numberOfLines={2}>
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

                <Text variant="bodyMedium" style={styles.eventDescription} numberOfLines={2}>
                  {event.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.churchInfo}>
                    <Avatar.Icon
                      icon="church"
                      size={20}
                      style={styles.churchIcon}
                    />
                    <Text variant="bodySmall" style={styles.churchName} numberOfLines={1}>
                      {event.churchName}
                    </Text>
                  </View>
                </View>
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
  eventDescription: {
    color: '#475569',
    lineHeight: 20,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  churchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  churchIcon: {
    backgroundColor: 'transparent',
  },
  churchName: {
    color: '#64748B',
    fontSize: 13,
    flex: 1,
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