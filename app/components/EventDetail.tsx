import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button, Divider, List, Text } from 'react-native-paper';
import { EventWithDistance } from '../../types';

interface EventDetailProps {
  item: EventWithDistance & { itemType: 'event' };
  onDirections: (item: any) => void;
  formatDate: (dateStr: string) => string;
}

const EventDetail: React.FC<EventDetailProps> = ({ item, onDirections, formatDate }) => {
  const addToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès au calendrier pour ajouter cet événement.'
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Erreur', 'Aucun calendrier disponible');
        return;
      }

      const eventDate = new Date(item.date);
      const [startHour, startMinute] = item.startTime.split(':').map(Number);
      const [endHour, endMinute] = item.endTime.split(':').map(Number);

      const startDate = new Date(eventDate);
      startDate.setHours(startHour, startMinute, 0, 0);

      const endDate = new Date(eventDate);
      endDate.setHours(endHour, endMinute, 0, 0);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: item.title,
        startDate: startDate,
        endDate: endDate,
        location: `${item.address}, ${item.city}`,
        notes: `${item.description}\n\nOrganisé par: ${item.churchName}\nContact: ${item.email}`,
        alarms: [{ relativeOffset: -60 }],
      });

      Alert.alert('Succès', 'Événement ajouté à votre calendrier !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'événement au calendrier');
      console.error(error);
    }
  };

  return (
    <View style={styles.detailsContainer}>
      {/* En-tête avec Titre et Date */}
      <View style={styles.headerContainer}>
        <View style={styles.dateBadge}>
          <MaterialCommunityIcons name="calendar-month" size={16} color="#10B981" />
          <Text style={styles.dateBadgeText}>{formatDate(item.date)}</Text>
        </View>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {item.title}
        </Text>
        <View style={styles.timeBadge}>
          <MaterialCommunityIcons name="clock-time-four-outline" size={16} color="#64748B" />
          <Text style={styles.timeBadgeText}>{item.startTime} - {item.endTime}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <Button
          mode="contained"
          icon="calendar-plus"
          style={[styles.actionButton, styles.primaryAction]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={addToCalendar}
          buttonColor="#10B981"
        >
          Ajouter
        </Button>
        <Button
          mode="contained-tonal"
          icon="directions"
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => onDirections(item)}
        >
          Y aller
        </Button>
      </View>

      <Divider style={styles.sectionDivider} />

      {/* Description */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>À propos</Text>
        <Text variant="bodyMedium" style={styles.aboutText}>
          {item.description}
        </Text>
      </View>

      {/* Informations Lieu & Organisateur */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Détails</Text>

        <View style={styles.infoCard}>
          <List.Item
            title={item.churchName || "Église organisatrice"}
            description="Organisateur"
            left={props => (
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="church" size={20} color="#6366F1" />
              </View>
            )}
            style={styles.infoItem}
          />
          <Divider style={styles.cardDivider} />
          <List.Item
            title={`${item.address}, ${item.city}`}
            description="Lieu"
            titleNumberOfLines={2}
            left={props => (
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#6366F1" />
              </View>
            )}
            style={styles.infoItem}
          />
          <Divider style={styles.cardDivider} />

          {item.organizer && (
            <>
              <List.Item
                title={item.organizer}
                description="Responsable"
                left={props => (
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="account" size={20} color="#6366F1" />
                  </View>
                )}
                style={styles.infoItem}
              />
              <Divider style={styles.cardDivider} />
            </>
          )}

          {/* Contact Links */}
          <List.Item
            title={item.phone}
            description="Téléphone"
            left={props => (
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="phone" size={20} color="#6366F1" />
              </View>
            )}
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
            style={styles.infoItem}
          />

          {item.whatsapp && (
            <>
              <Divider style={styles.cardDivider} />
              <List.Item
                title="WhatsApp"
                description="Contacter sur WhatsApp"
                left={props => (
                  <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color="#10B981" />
                  </View>
                )}
                onPress={() => Linking.openURL(item.whatsapp!)}
                style={styles.infoItem}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default EventDetail;

const styles = StyleSheet.create({
  detailsContainer: {
    paddingBottom: 40,
    backgroundColor: 'white',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5', // Emerald 50
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateBadgeText: {
    color: '#059669', // Emerald 600
    fontWeight: '700',
    fontSize: 13,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8
  },
  timeBadgeText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    lineHeight: 32,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  primaryAction: {
    flex: 1.5,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionButtonContent: {
    height: 48,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 24,
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    fontSize: 18,
  },
  aboutText: {
    color: '#475569',
    lineHeight: 26,
    fontSize: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  infoItem: {
    paddingVertical: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardDivider: {
    backgroundColor: '#F1F5F9',
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
});
