import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
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
  const isChurch = item.itemType === 'church';

  return (
    <Card
      style={[
        styles.cardContainer,
        focused && styles.cardFocused,
      ]}
      onPress={() => onAnimate(item, index)}
      mode="elevated"
      elevation={focused ? 4 : 2}
    >
      <View style={styles.cardContent}>
        {/* Header: Icon + Info + Distance */}
        <View style={styles.mainRow}>
          {/* Icon Box */}
          <View style={[
            styles.iconBox,
            isChurch ? styles.iconBoxChurch : styles.iconBoxEvent
          ]}>
            <MaterialCommunityIcons
              name={isChurch ? "church" : "calendar-star"}
              size={24}
              color={isChurch ? "#6366F1" : "#10B981"}
            />
          </View>

          {/* Text Info */}
          <View style={styles.infoCol}>
            <Text style={styles.title} numberOfLines={1}>
              {isChurch ? item.name : item.title}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              {isChurch ? item.address : `${item.city} • ${formatDate(item.date)}`}
            </Text>

            {/* Badges Row */}
            {isChurch && (
              <View style={styles.badgesRow}>
                {item.parking && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="parking" size={12} color="#64748B" />
                    <Text style={styles.badgeText}>Parking</Text>
                  </View>
                )}
                {item.accessible && (
                  <View style={styles.badge}>
                    <MaterialCommunityIcons name="wheelchair-accessibility" size={12} color="#64748B" />
                    <Text style={styles.badgeText}>PMR</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Prominent Distance Block */}
          <View style={styles.distanceBlock}>
            <Text style={styles.distanceValue}>{item.distance.toFixed(1)}</Text>
            <Text style={styles.distanceUnit}>km</Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Button
            mode="text"
            textColor="#64748B"
            compact
            onPress={() => onPress(item)}
            labelStyle={styles.actionLabel}
          >
            Voir les détails
          </Button>
          <Button
            mode="contained"
            icon="navigation-variant"
            compact
            onPress={() => onDirections(item)}
            buttonColor="#6366F1"
            style={styles.directionButton}
            labelStyle={styles.directionLabel}
          >
            Y aller
          </Button>
        </View>
      </View>
    </Card>
  );
};

// Memoization avec comparaison personnalisée pour éviter les re-renders inutiles
export default React.memo(ListItemCard, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.focused === nextProps.focused &&
    prevProps.item.distance === nextProps.item.distance
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    marginHorizontal: 4, // Pour éviter que l'ombre soit coupée
  },
  cardFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: '#F8FAFC',
  },
  cardContent: {
    padding: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxChurch: {
    backgroundColor: '#EEF2FF', // Light Indigo
  },
  iconBoxEvent: {
    backgroundColor: '#ECFDF5', // Light Emerald
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
  },
  address: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  distanceBlock: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 12,
    minWidth: 50,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
    lineHeight: 22,
  },
  distanceUnit: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  directionButton: {
    borderRadius: 8,
    elevation: 0,
  },
  directionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
