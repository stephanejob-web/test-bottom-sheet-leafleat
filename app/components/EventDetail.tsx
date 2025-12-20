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
          <MaterialCommunityIcons name="calendar-month" size={16} color="#6366F1" />
          <Text style={styles.dateBadgeText}>{formatDate(item.date)}</Text>
        </View>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {item.title}
        </Text>
        <View style={styles.timeBadge}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
          <Text style={styles.timeBadgeText}>{item.startTime} - {item.endTime}</Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Button
          mode="contained"
          icon="calendar-plus"
          style={[styles.quickActionButton, styles.calendarButton]}
          contentStyle={{ height: 44 }}
          onPress={addToCalendar}
        >
          Ajouter
        </Button>
        <Button
          mode="contained"
          icon="directions"
          buttonColor="#6366F1"
          style={styles.quickActionButton}
          contentStyle={{ height: 44 }}
          onPress={() => onDirections(item)}
        >
          Y aller
        </Button>
      </View>

      <Divider style={styles.divider} />

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

        <List.Item
          title={item.organizer || "Organisateur"}
          description="Organisateur"
          left={props => <List.Icon {...props} icon="church" color="#6366F1" />}
          style={styles.listItem}
        />
        <List.Item
          title={`${item.address}, ${item.city}`}
          description="Lieu"
          titleNumberOfLines={2}
          left={props => <List.Icon {...props} icon="map-marker" color="#6366F1" />}
          style={styles.listItem}
        />

        <List.Item
          title={item.organizer || "Contact"}
          description="Responsable"
          left={props => <List.Icon {...props} icon="account" color="#6366F1" />}
          style={styles.listItem}
        />

        {/* Contact Links */}
        <List.Item
          title={item.phone}
          description="Téléphone"
          left={props => <List.Icon {...props} icon="phone" color="#6366F1" />}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
          style={styles.listItem}
        />
        {item.whatsapp && (
          <List.Item
            title="WhatsApp"
            description="Contacter sur WhatsApp"
            left={props => <List.Icon {...props} icon="whatsapp" color="#25D366" />}
            onPress={() => Linking.openURL(item.whatsapp!)}
            style={styles.listItem}
          />
        )}
      </View>

    </View>
  );
};

export default EventDetail;

const styles = StyleSheet.create({
  detailsContainer: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateBadgeText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 13,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  timeBadgeText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    lineHeight: 32,
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#F1F5F9',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
  },
  calendarButton: {
    backgroundColor: '#10B981',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    fontSize: 18,
  },
  aboutText: {
    color: '#475569',
    lineHeight: 24,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
});
