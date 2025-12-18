/**
 * Interface pour les événements
 */
export interface Event {
  id: string;
  title: string;
  type: string;
  description: string;
  churchId: string;
  churchName: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  date: string;
  startTime: string;
  endTime: string;
  organizer: string;
  email: string;
  phone: string;
  whatsapp: string;
}

/**
 * Interface pour les événements avec distance calculée
 */
export interface EventWithDistance extends Event {
  distance: number;
}