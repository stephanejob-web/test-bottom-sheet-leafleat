import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Card, Text, Avatar, Button, Chip } from 'react-native-paper';
import { ChurchWithDistance } from '../../types';

interface ChurchDetailProps {
  item: ChurchWithDistance & { itemType: 'church' };
  onDirections: (item: any) => void;
}

const ChurchDetail: React.FC<ChurchDetailProps> = ({ item, onDirections }) => {
  return (
    <View style={styles.detailsContainer}>
      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Button
          mode="contained"
          icon="phone"
          style={styles.quickActionButton}
          labelStyle={styles.quickActionLabel}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
        >
          Appeler
        </Button>
        <Button
          mode="contained"
          icon="email"
          style={styles.quickActionButton}
          labelStyle={styles.quickActionLabel}
          onPress={() => Linking.openURL(`mailto:${item.email}`)}
        >
          Email
        </Button>
        <Button
          mode="contained"
          icon="directions"
          style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
          labelStyle={styles.quickActionLabel}
          onPress={() => onDirections(item)}
        >
          Itinéraire
        </Button>
      </View>

      {/* À propos */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="information" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              À propos
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {item.description}
          </Text>
        </Card.Content>
      </Card>

      {/* Adresse */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="map-marker" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Adresse
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.detailCardText}>
            {item.address}
          </Text>
        </Card.Content>
      </Card>

      {/* Pasteur */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="account-tie" size={32} style={styles.detailCardIcon} />
            <View style={styles.detailCardHeaderText}>
              <Text variant="labelSmall" style={styles.detailCardLabel}>
                Pasteur
              </Text>
              <Text variant="titleMedium" style={styles.detailCardTitle}>
                {item.pastor}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Contact */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="phone" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Contact
            </Text>
          </View>
          <View style={styles.contactInfoContainer}>
            <View style={styles.contactInfoRow}>
              <Text variant="bodyMedium" style={styles.contactInfoLabel}>
                Téléphone :
              </Text>
              <Text variant="bodyMedium" style={styles.contactInfoValue}>
                {item.phone}
              </Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text variant="bodyMedium" style={styles.contactInfoLabel}>
                Email :
              </Text>
              <Text variant="bodyMedium" style={styles.contactInfoValue}>
                {item.email}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Horaires des cultes */}
      <Card mode="outlined" style={styles.detailCard}>
        <Card.Content>
          <View style={styles.detailCardHeader}>
            <Avatar.Icon icon="calendar-clock" size={32} style={styles.detailCardIcon} />
            <Text variant="titleMedium" style={styles.detailCardTitle}>
              Horaires des cultes
            </Text>
          </View>
          <View style={styles.servicesContainer}>
            {item.services.map((service, index) => (
              <Chip
                key={index}
                icon="clock-outline"
                mode="flat"
                style={styles.serviceChip}
                textStyle={styles.serviceChipText}
              >
                {service}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

export default ChurchDetail;

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
    backgroundColor: '#6366F1',
  },
  quickActionButtonPrimary: {
    backgroundColor: '#3B82F6',
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
  detailCardLabel: {
    color: '#64748B',
    marginBottom: 4,
  },
  detailCardHeaderText: {
    flex: 1,
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
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    backgroundColor: '#F1F5F9',
  },
  serviceChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
});
