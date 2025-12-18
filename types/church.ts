/**
 * Interface pour les églises
 */
export interface Church {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  pastor: string;
  email: string;
  phone: string;
  services: string[];
  description: string;
  tags?: string[];
  capacity?: number;
  accessible?: boolean;
  parking?: boolean;
  website?: string;
}

/**
 * Interface pour les églises avec distance calculée
 */
export interface ChurchWithDistance extends Church {
  distance: number;
}