/**
 * Configuration des types d'événements avec leurs icônes et couleurs
 */
export const eventTypeConfig: { [key: string]: { label: string; icon: string; color: string } } = {
  'evangelisation': { label: 'Évangélisation', icon: 'account-group', color: '#10B981' },
  'priere': { label: 'Prière', icon: 'hands-pray', color: '#8B5CF6' },
  'bapteme': { label: 'Baptême', icon: 'water', color: '#3B82F6' },
  'louange': { label: 'Louange', icon: 'music', color: '#F59E0B' },
  'conference': { label: 'Conférence', icon: 'book-open-variant', color: '#EF4444' },
  'retraite': { label: 'Retraite', icon: 'pine-tree', color: '#059669' },
};