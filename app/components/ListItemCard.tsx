import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Avatar, IconButton, Button } from 'react-native-paper';
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
            <Text
              variant="titleMedium"
              style={styles.cardCompactTitle}
              numberOfLines={1}
            >
              {item.itemType === 'church' ? item.name : item.title}
            </Text>

            <View style={styles.cardCompactMeta}>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  {item.distance.toFixed(1)} km
                </Text>
              </View>
            </View>

            <Text
              variant="bodySmall"
              style={styles.cardCompactAddress}
              numberOfLines={2}
            >
              {item.itemType === 'church' ? item.address : `${item.city} • ${formatDate(item.date)}`}
            </Text>
          </View>
        </View>

        <View style={styles.cardCompactActions}>
          <IconButton
            icon="information-outline"
            size={20}
            iconColor="#6366F1"
            containerColor="#EEF2FF"
            onPress={() => onPress(item)}
            style={styles.cardCompactActionButton}
          />
          <Button
            mode="contained"
            icon="directions"
            compact
            onPress={() => onDirections(item)}
            style={styles.cardCompactDirectionsButton}
            labelStyle={styles.cardCompactDirectionsLabel}
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
});
