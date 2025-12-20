import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Divider, List, Text } from 'react-native-paper';
import { useChurchDetails } from '../../hooks/use-churches';
import { ChurchWithDistance } from '../../types';

interface ChurchDetailProps {
  item: ChurchWithDistance & { itemType: 'church' };
  onDirections: (item: any) => void;
}

const ChurchDetail: React.FC<ChurchDetailProps> = ({ item: initialItem, onDirections }) => {
  // Fetch full details progressively
  const { church: fullDetails, loading } = useChurchDetails(Number(initialItem.id));

  // Merge initial item with full details
  const item = useMemo(() => {
    return {
      ...initialItem,
      ...fullDetails,
      // Ensure arrays are at least empty if missing
      services: fullDetails?.services || initialItem.services || [],
      tags: fullDetails?.tags || initialItem.tags || [],
    };
  }, [initialItem, fullDetails]);

  return (
    <View style={styles.detailsContainer}>
      {/* En-tête avec Nom et Badges */}
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            {item.name}
          </Text>
        </View>
        <Text variant="bodyLarge" style={styles.headerAddress}>
          {item.address}
        </Text>

        <View style={styles.badgesRow}>
          <View style={styles.distanceBadge}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color="#6366F1" />
            <Text style={styles.distanceBadgeText}>{initialItem.distance.toFixed(1)} km</Text>
          </View>
          {!!item.parking && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="parking" size={14} color="#64748B" />
              <Text style={styles.badgeText}>Parking</Text>
            </View>
          )}
          {!!item.accessible && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="wheelchair-accessibility" size={14} color="#64748B" />
              <Text style={styles.badgeText}>PMR</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions - Floating Style */}
      <View style={styles.quickActionsRow}>
        <Button
          mode="contained"
          icon="directions"
          buttonColor="#6366F1"
          style={[styles.actionButton, styles.primaryAction]}
          contentStyle={styles.actionButtonContent}
          labelStyle={styles.actionButtonLabel}
          onPress={() => onDirections(item)}
        >
          Y aller
        </Button>
        <Button
          mode="outlined"
          icon="phone"
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
          onPress={() => Linking.openURL(`tel:${item.phone}`)}
          textColor="#475569"
        >
          Appeler
        </Button>
        <Button
          mode="outlined"
          icon="email"
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
          onPress={() => Linking.openURL(`mailto:${item.email}`)}
          textColor="#475569"
        >
          Email
        </Button>
      </View>

      <Divider style={styles.sectionDivider} />

      {/* About Section */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>À propos</Text>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagBadge}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text variant="bodyMedium" style={styles.aboutText}>
          {item.description || "Aucune description disponible pour cette église."}
        </Text>
      </View>

      {/* Information Card */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Coordonnées</Text>
        <View style={styles.infoCard}>
          <List.Item
            title={item.pastor}
            description="Pasteur principal"
            left={props => (
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="account-tie" size={20} color="#6366F1" />
              </View>
            )}
            style={styles.infoItem}
          />
          {!!item.capacity && (
            <>
              <Divider style={styles.cardDivider} />
              <List.Item
                title={`${item.capacity} places`}
                description="Capacité d'accueil"
                left={props => (
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="seat" size={20} color="#6366F1" />
                  </View>
                )}
                style={styles.infoItem}
              />
            </>
          )}
          <Divider style={styles.cardDivider} />
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
          <Divider style={styles.cardDivider} />
          <List.Item
            title={item.email}
            description="Email"
            left={props => (
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email" size={20} color="#6366F1" />
              </View>
            )}
            onPress={() => Linking.openURL(`mailto:${item.email}`)}
            style={styles.infoItem}
          />
          {item.website && (
            <>
              <Divider style={styles.cardDivider} />
              <List.Item
                title={item.website.replace(/^https?:\/\//, '')}
                description="Site Web"
                left={props => (
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="web" size={20} color="#6366F1" />
                  </View>
                )}
                onPress={() => Linking.openURL(item.website!)}
                style={styles.infoItem}
              />
            </>
          )}
        </View>
      </View>

      {/* Horaires des cultes */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Nos cultes & Réunions</Text>
        <View style={styles.servicesGrid}>
          {item.services.map((service, index) => (
            <View key={index} style={styles.serviceCard}>
              <View style={styles.serviceIconBox}>
                <MaterialCommunityIcons name="clock-time-four" size={20} color="#6366F1" />
              </View>
              <Text style={styles.serviceCardText}>{service}</Text>
            </View>
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
    backgroundColor: 'white',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 32,
  },
  headerAddress: {
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 24,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceBadgeText: {
    color: '#6366F1',
    fontWeight: '700',
    fontSize: 12,
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
    flex: 1.5, // Le bouton principal est plus large
    borderColor: 'transparent',
    elevation: 4,
    shadowColor: '#6366F1',
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
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  tagText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCardText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
  },
});
