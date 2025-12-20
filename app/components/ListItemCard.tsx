import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Text } from 'react-native-paper';
import { ChurchWithDistance, EventWithDistance } from '../../types';

// Type pour les items de la liste
type ListItem = (ChurchWithDistance & { itemType: 'church' }) | (EventWithDistance & { itemType: 'event' });

interface ListItemCardProps {
  item: ListItem;
  index: number;
  focused: boolean;
  onPress: (item: ListItem) => void;
  onDirections: (item: ListItem) => void;
  onAnimate: (item: ListItem, index: number) => void;
  formatDate: (dateStr: string) => string;
}

const ListItemCard: React.FC<ListItemCardProps> = ({
  item,
  index,
  focused,
  onPress,
  onDirections,
  onAnimate,
  formatDate,
}) => {
  return (
    <Card
      style={[
        styles.churchCardCompact,
        focused && styles.churchCardCompactFocused,
      ]}
      onPress={() => onAnimate(item, index)}
      mode="elevated"
      elevation={focused ? 4 : 1}
    >
      <View style={styles.cardCompactContent}>
        <View style={styles.cardCompactMain}>
          <Avatar.Icon
            icon={item.itemType === 'church' ? 'cross' : 'calendar-star'}
            size={48}
            style={[
              styles.cardCompactAvatar,
              item.itemType === 'church' && { backgroundColor: '#EF4444' },
              item.itemType === 'event' && { backgroundColor: '#10B981' },
              focused && styles.cardCompactAvatarFocused,
            ]}
          />

          <View style={styles.cardCompactInfo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text
                style={styles.cardCompactTitle}
                numberOfLines={1}
              >
                {item.itemType === 'church' ? item.name : item.title}
              </Text>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  {item.distance.toFixed(1)} km
                </Text>
              </View>
            </View>

            <Text
              style={styles.cardCompactAddress}
              numberOfLines={2}
            >
              {item.itemType === 'church' ? item.address : `${item.city} • ${formatDate(item.date)}`}
            </Text>

            {/* Badges pour les églises */}
            {item.itemType === 'church' && (
              <View style={styles.badgesContainer}>
                {item.parking && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="parking" size={12} color="#64748B" />
                    <Text style={styles.badgeText}>Parking</Text>
                  </View>
                )}
                {item.accessible && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={12} color="#64748B" />
                    <Text style={styles.badgeText}>Accès PMR</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardCompactActionRow}>
          <Button
            mode="text"
            textColor="#64748B"
            compact
            onPress={() => onPress(item)}
            labelStyle={{ fontSize: 13 }}
          >
            Détails
          </Button>
          <Button
            mode="contained"
            icon="directions"
            compact
            onPress={() => onDirections(item)}
            buttonColor="#6366F1"
            contentStyle={{ height: 36 }}
            labelStyle={{ fontSize: 13, fontWeight: '600' }}
          >
            Itinéraire
          </Button>
        </View>
      </View>
    </Card>
  );
};

// Memoization avec comparaison personnalisée pour éviter les re-renders inutiles
export default React.memo(ListItemCard, (prevProps, nextProps) => {
  // Ne re-render que si l'item ID, le focus ou la distance change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.focused === nextProps.focused &&
    prevProps.item.distance === nextProps.item.distance
  );
});

const styles = StyleSheet.create({
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
    gap: 4,
  },
  cardCompactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  cardCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardCompactAddress: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  cardCompactActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  distanceBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeText: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: '600',
  },
});
