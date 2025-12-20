/**
 * Calcule la distance entre deux points GPS en kilomètres
 * Utilise la formule de Haversine
 *
 * @param lat1 Latitude du point 1
 * @param lon1 Longitude du point 1
 * @param lat2 Latitude du point 2
 * @param lon2 Longitude du point 2
 * @returns Distance en kilomètres
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filtre les items par bounding box (viewport) SANS calcul de distance
 * Optimisé pour les performances - filtrage géométrique pur
 *
 * @param items Tableau d'items avec latitude/longitude
 * @param region Région visible (viewport de la map)
 * @param margin Marge à ajouter (par défaut 20%)
 * @returns Items filtrés dans la zone visible
 */
export function filterItemsByBoundingBox<T extends { latitude: number; longitude: number }>(
  items: T[],
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  },
  margin: number = 0.2
): T[] {
  const marginLat = region.latitudeDelta * margin;
  const marginLng = region.longitudeDelta * margin;

  const boundingBox = {
    minLat: region.latitude - (region.latitudeDelta / 2) - marginLat,
    maxLat: region.latitude + (region.latitudeDelta / 2) + marginLat,
    minLng: region.longitude - (region.longitudeDelta / 2) - marginLng,
    maxLng: region.longitude + (region.longitudeDelta / 2) + marginLng,
  };

  return items.filter(
    (item) =>
      item.latitude >= boundingBox.minLat &&
      item.latitude <= boundingBox.maxLat &&
      item.longitude >= boundingBox.minLng &&
      item.longitude <= boundingBox.maxLng
  );
}

/**
 * Filtre les items par rayon autour d'un point central
 *
 * @param items Tableau d'items
 * @param centerLat Latitude du centre
 * @param centerLng Longitude du centre
 * @param radiusKm Rayon en kilomètres
 * @returns Items dans le rayon
 */
export function filterItemsByRadius<T extends { latitude: number; longitude: number }>(
  items: T[],
  centerLat: number,
  centerLng: number,
  radiusKm: number
): T[] {
  // Pré-filtrage rapide par bounding box (carré autour du cercle) pour éviter calculs coûteux
  // 1 degré lat ~= 111km. 1 degré log ~= 111km * cos(lat).
  // Approx bourrine pour bounding box : 1 deg ~= 100km pour être large
  const degDelta = radiusKm / 100;

  const minLat = centerLat - degDelta;
  const maxLat = centerLat + degDelta;
  const minLng = centerLng - degDelta * 1.5; // Marge sécurité longitude
  const maxLng = centerLng + degDelta * 1.5;

  const candidates = items.filter(
    (item) =>
      item.latitude >= minLat &&
      item.latitude <= maxLat &&
      item.longitude >= minLng &&
      item.longitude <= maxLng
  );

  // Filtrage précis par distance
  return candidates.filter(item => {
    const dist = calculateDistance(centerLat, centerLng, item.latitude, item.longitude);
    return dist <= radiusKm;
  });
}

/**
 * Calcule les distances pour un batch d'items avec support de cache
 * Retourne les items avec distance, triés par distance
 *
 * @param items Tableau d'items à calculer
 * @param centerLat Latitude du point de référence
 * @param centerLng Longitude du point de référence
 * @param cache Cache Map optionnel pour éviter les recalculs
 * @param cacheKeyPrefix Préfixe pour les clés de cache
 * @returns Items avec distance calculée, triés par distance
 */
export function calculateDistancesForItems<T extends { latitude: number; longitude: number }>(
  items: T[],
  centerLat: number,
  centerLng: number,
  cache?: Map<string, number>,
  cacheKeyPrefix?: string
): (T & { distance: number })[] {
  return items
    .map((item) => {
      const cacheKey = cacheKeyPrefix ? `${cacheKeyPrefix}-${item.latitude}-${item.longitude}` : null;
      let distance: number;

      if (cache && cacheKey && cache.has(cacheKey)) {
        distance = cache.get(cacheKey)!;
      } else {
        distance = calculateDistance(centerLat, centerLng, item.latitude, item.longitude);
        if (cache && cacheKey) {
          cache.set(cacheKey, distance);
        }
      }

      return { ...item, distance };
    })
    .sort((a, b) => a.distance - b.distance);
}