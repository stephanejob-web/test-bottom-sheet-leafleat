import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, List, Text } from 'react-native-paper';
import { ChurchWithDistance } from '../../types';

interface ChurchDetailProps {
  item: ChurchWithDistance & { itemType: 'church' };
  onDirections: (item: any) => void;
}

const ChurchDetail: React.FC<ChurchDetailProps> = ({ item, onDirections }) => {
  return (
    <View style={styles.detailsContainer}>
      {/* En-tête avec Nom et Badges */}
      <View style={styles.headerContainer}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {item.name}
        </Text>
        <Text variant="bodyMedium" style={styles.headerAddress}>
          {item.address}
        </Text>

        <View style={styles.badgesRow}>
          {item.parking && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="parking" size={14} color="#64748B" />
              <Text style={styles.badgeText}>Parking</Text>
            </View>
          )}
          {item.accessible && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="wheelchair-accessibility" size={14} color="#64748B" />
              <Text style={styles.badgeText}>Accès PMR</Text>
            </View>
          )}
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>{Math.round(item.distance * 10) / 10} km</Text>
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Button
          mode="contained-tonal"
          icon="phone"
          style={styles.quickActionButton}
          contentStyle={{ height: 44 }}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
        >
          Appeler
        </Button>
        <Button
          mode="contained-tonal"
          icon="email"
          style={styles.quickActionButton}
          contentStyle={{ height: 44 }}
          onPress={() => Linking.openURL(`mailto:${item.email}`)}
        >
          Email
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

      {/* Sections d'informations */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>À propos</Text>
        <Text variant="bodyMedium" style={styles.aboutText}>
          {item.description}
        </Text>
      </View>

      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Informations</Text>
        <List.Item
          title={item.pastor}
          description="Pasteur principal"
          left={props => <List.Icon {...props} icon="account-tie" color="#6366F1" />}
          style={styles.listItem}
        />
        <List.Item
          title={item.phone}
          description="Téléphone"
          left={props => <List.Icon {...props} icon="phone" color="#6366F1" />}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
          style={styles.listItem}
        />
        <List.Item
          title={item.email}
          description="Email"
          left={props => <List.Icon {...props} icon="email" color="#6366F1" />}
          onPress={() => Linking.openURL(`mailto:${item.email}`)}
          style={styles.listItem}
        />
        {item.website && (
          <List.Item
            title="Site Web"
            description={item.website}
            left={props => <List.Icon {...props} icon="web" color="#6366F1" />}
            onPress={() => Linking.openURL(item.website!)}
            style={styles.listItem}
          />
        )}
      </View>

      {/* Horaires des cultes */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Horaires des cultes</Text>
        <View style={styles.servicesContainer}>
          {item.services.map((service, index) => (
            <Chip
              key={index}
              icon="clock-outline"
              mode="outlined"
              style={styles.serviceChip}
              textStyle={styles.serviceChipText}
            >
              {service}
            </Chip>
          ))}
        </View>
      </View>
    </View>
  );
};

export default ChurchDetail;

const styles = StyleSheet.create({
  detailsContainer: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerAddress: {
    color: '#64748B',
    marginBottom: 12,
    fontSize: 15,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  distanceBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceBadgeText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 12,
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
    paddingHorizontal: 0, // Reset padding for alignment
    paddingVertical: 4,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
  },
  serviceChipText: {
    color: '#475569',
    fontSize: 13,
  },
});
