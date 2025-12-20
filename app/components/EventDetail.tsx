import React from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import { Card, Text, Avatar, Button } from 'react-native-paper';
import * as Calendar from 'expo-calendar';
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
        notes: `${item.description}\\n\\nOrganisé par: ${item.churchName}\\nContact: ${item.email}`,
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
      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Button
          mode="contained"
          icon="phone"
          style={[styles.quickActionButton, { backgroundColor: '#3B82F6' }]}
          labelStyle={styles.quickActionLabel}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
        >
          Appeler
        </Button>
        {item.whatsapp && (
          <Button
            mode="contained"
            icon="whatsapp"
            style={[styles.quickActionButton, { backgroundColor: '#25D366' }]}
            labelStyle={styles.quickActionLabel}
            onPress={() => Linking.openURL(item.whatsapp)}
          >
            WhatsApp
          </Button>
        )}
        <Button
          mode="contained"
          icon="directions"
          style={[styles.quickActionButton, { backgroundColor: '#6366F1' }]}
          labelStyle={styles.quickActionLabel}
          onPress={() => onDirections(item)}
        >
          Itinéraire
        </Button>
      </View>

      {/* Date et heure */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="calendar" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Date et heure
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {formatDate(item.date)} • {item.startTime} - {item.endTime}
          </Text>
        </Card.Content>
      </Card>

      {/* Description */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="information" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Description
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {item.description}
          </Text>
        </Card.Content>
      </Card>

      {/* Église organisatrice */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="church" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Église organisatrice
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {item.churchName}
          </Text>
        </Card.Content>
      </Card>

      {/* Lieu */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="map-marker" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Lieu
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {item.address}
          </Text>
          <Text variant="bodySmall" style={[styles.detailCardText, { marginTop: 4 }]}>
            {item.city}, {item.country}
          </Text>
        </Card.Content>
      </Card>

      {/* Organisateur */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="account" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Organisateur
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {item.organizer}
          </Text>
        </Card.Content>
      </Card>

      {/* Contact */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="email" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Contact
            </Text>
          </View>
          <View style={styles.contactInfoContainer}>
            <View style={styles.contactInfoRow}>
              <Text variant="bodyMedium" style={styles.contactInfoLabel}>
                Email :
              </Text>
              <Text variant="bodyMedium" style={styles.contactInfoValue}>
                {item.email}
              </Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text variant="bodyMedium" style={styles.contactInfoLabel}>
                Téléphone :
              </Text>
              <Text variant="bodyMedium" style={styles.contactInfoValue}>
                {item.phone}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Bouton Ajouter au calendrier */}
      <Button
        mode="contained"
        icon="calendar-plus"
        onPress={addToCalendar}
        style={styles.addToCalendarButton}
        labelStyle={styles.addToCalendarLabel}
      >
        Ajouter au calendrier
      </Button>
    </View>
  );
};

export default EventDetail;

const styles = StyleSheet.create({
  detailsContainer: {
    paddingBottom: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
    paddingHorizontal: 16,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderColor: '#E2E8F0',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  detailCardIcon: {
    backgroundColor: '#EEF2FF',
  },
  detailCardTitle: {
    color: '#1E293B',
    fontWeight: '600',
  },
  detailCardText: {
    color: '#475569',
    lineHeight: 22,
  },
  contactInfoContainer: {
    gap: 8,
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
  addToCalendarButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  addToCalendarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
