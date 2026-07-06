import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AuthenticatedUser } from './App';

const mapCenter: [number, number] = [71.43, 51.13];
const mapZoom = 13;
const darkStyleUrl = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const lightStyleUrl = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const territorySourceId = 'territories-source';
const territoryFillLayerId = 'territories-fill';
const territoryLineLayerId = 'territories-line';
const emptyTerritoryData: TerritoryFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const routesSourceId = 'routes-source';
const routesLineLayerId = 'routes-line';
const emptyRoutesData: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const liveRouteSourceId = 'live-route-source';
const liveRouteLayerId = 'live-route-layer';
const livePointLayerId = 'live-point-layer';

export type TerritoryFeatureCollection = FeatureCollection<
  Geometry,
  { id: string; owner_id: string; owner_orda_id: string | null }
>;

export type RouteFeatureCollection = FeatureCollection<
  Geometry,
  { id: string; owner_id: string }
>;

type MapAreaProps = {
  territories: TerritoryFeatureCollection | null;
  routes: RouteFeatureCollection | null;
  currentUser: AuthenticatedUser | null;
  liveCoordinates?: [number, number][];
  ordaMode?: boolean;
};

export function MapArea({ territories, routes, currentUser, liveCoordinates, ordaMode = false }: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const territoriesRef = useRef<TerritoryFeatureCollection | null>(territories);
  const routesRef = useRef<RouteFeatureCollection | null>(routes);
  const currentUserRef = useRef<AuthenticatedUser | null>(currentUser);
  const liveCoordinatesRef = useRef<[number, number][] | undefined>(liveCoordinates);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    territoriesRef.current = territories;
  }, [territories]);

  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  useEffect(() => {
    liveCoordinatesRef.current = liveCoordinates;
    if (mapRef.current) {
      syncLiveRoute(mapRef.current);
    }
  }, [liveCoordinates]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const ordaModeRef = useRef<boolean>(ordaMode);

  useEffect(() => {
    ordaModeRef.current = ordaMode;
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      applyTerritoryStyle(mapRef.current);
    }
  }, [ordaMode]);

  const applyTerritoryStyle = (map: maplibregl.Map) => {
    if (!map.getSource(territorySourceId)) {
      map.addSource(territorySourceId, {
        type: 'geojson',
        data: territoriesRef.current ?? emptyTerritoryData,
      });
    }

    const colorSelf = currentUserRef.current?.colorSelf ?? '#d8a760'; // User chosen color or Gold
    const colorOthers = '#2c5a5a'; // Teal
    const colorOrda = '#22c55e'; // Green for own Orda members
    
    const ownerMatch = currentUserRef.current?.id ?? '__none__';
    const ordaMatch = currentUserRef.current?.ordaId ?? '__none__';
    const isOrdaMode = ordaModeRef.current;

    // In Orda Mode:
    // If owner == me -> colorSelf
    // If owner_orda_id == my_orda -> colorOrda
    // Else -> colorOthers
    // In Personal Mode:
    // If owner == me -> colorSelf
    // Else -> colorOthers

    let fillColorExpression: maplibregl.ExpressionSpecification;
    
    if (isOrdaMode && ordaMatch !== '__none__') {
      fillColorExpression = [
        'case',
        ['==', ['get', 'owner_id'], ownerMatch],
        colorSelf,
        ['==', ['get', 'owner_orda_id'], ordaMatch],
        colorOrda,
        colorOthers,
      ];
    } else {
      fillColorExpression = [
        'case',
        ['==', ['get', 'owner_id'], ownerMatch],
        colorSelf,
        colorOthers,
      ];
    }

    if (!map.getLayer(territoryFillLayerId)) {
      map.addLayer({
        id: territoryFillLayerId,
        type: 'fill',
        source: territorySourceId,
        paint: {
          'fill-color': fillColorExpression,
          'fill-opacity': 0.4,
        },
      });
    } else {
      map.setPaintProperty(territoryFillLayerId, 'fill-color', fillColorExpression);
    }

    if (!map.getLayer(territoryLineLayerId)) {
      map.addLayer({
        id: territoryLineLayerId,
        type: 'line',
        source: territorySourceId,
        paint: {
          'line-color': fillColorExpression,
          'line-width': 2,
        },
      });
    } else {
      map.setPaintProperty(territoryLineLayerId, 'line-color', fillColorExpression);
    }

    if (!map.getSource(routesSourceId)) {
      map.addSource(routesSourceId, {
        type: 'geojson',
        data: routesRef.current ?? emptyRoutesData,
      });
    }

    if (!map.getLayer(routesLineLayerId)) {
      map.addLayer({
        id: routesLineLayerId,
        type: 'line',
        source: routesSourceId,
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'owner_id'], ownerMatch],
            colorSelf,
            colorOthers,
          ],
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });
    }

    if (!map.getSource(liveRouteSourceId)) {
      map.addSource(liveRouteSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }

    if (!map.getLayer(liveRouteLayerId)) {
      map.addLayer({
        id: liveRouteLayerId,
        type: 'line',
        source: liveRouteSourceId,
        paint: {
          'line-color': '#d8a760',
          'line-width': 5,
          'line-opacity': 0.9,
          'line-dasharray': [2, 2],
        },
      });
    }

    if (!map.getLayer(livePointLayerId)) {
      map.addLayer({
        id: livePointLayerId,
        type: 'circle',
        source: liveRouteSourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#d8a760',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
        filter: ['==', '$type', 'Point'],
      });
    }
  };

  const syncTerritories = (map: maplibregl.Map) => {
    const source = map.getSource(territorySourceId) as maplibregl.GeoJSONSource | undefined;
    source?.setData(territoriesRef.current ?? emptyTerritoryData);
  };

  const syncRoutes = (map: maplibregl.Map) => {
    const source = map.getSource(routesSourceId) as maplibregl.GeoJSONSource | undefined;
    source?.setData(routesRef.current ?? emptyRoutesData);
  };

  const syncLiveRoute = (map: maplibregl.Map) => {
    const source = map.getSource(liveRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const coords = liveCoordinatesRef.current || [];
    
    // Coordinates from geolocation are [lat, lng], GeoJSON needs [lng, lat]
    const geoJsonCoords = coords.map(c => [c[1], c[0]]);

    const features: any[] = [];

    if (geoJsonCoords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: geoJsonCoords,
        },
        properties: {},
      });
    }

    if (geoJsonCoords.length >= 1) {
      const lastPoint = geoJsonCoords[geoJsonCoords.length - 1];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: lastPoint,
        },
        properties: {},
      });
      // Optionally pan to the user's location
      map.easeTo({ center: [lastPoint[0], lastPoint[1]] as [number, number], duration: 1000 });
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  };

  const syncThemePaint = (map: maplibregl.Map) => {
    if (!map.getLayer(territoryFillLayerId) || !map.getLayer(territoryLineLayerId)) {
      return;
    }

    const colorSelf = currentUserRef.current?.colorSelf ?? '#f97316';
    const colorOthers = currentUserRef.current?.colorOthers ?? '#ef4444';
    const ownerMatch = currentUserRef.current?.id ?? '__none__';

    map.setPaintProperty(territoryFillLayerId, 'fill-color', [
      'case',
      ['==', ['get', 'owner_id'], ownerMatch],
      colorSelf,
      colorOthers,
    ]);

    map.setPaintProperty(territoryLineLayerId, 'line-color', [
      'case',
      ['==', ['get', 'owner_id'], ownerMatch],
      colorSelf,
      colorOthers,
    ]);

    if (map.getLayer(routesLineLayerId)) {
      map.setPaintProperty(routesLineLayerId, 'line-color', [
        'case',
        ['==', ['get', 'owner_id'], ownerMatch],
        colorSelf,
        colorOthers,
      ]);
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: darkStyleUrl,
      center: mapCenter,
      zoom: mapZoom,
      minZoom: 2,
      attributionControl: false,
    } as maplibregl.MapOptions);

    mapRef.current = map;

    map.on('load', () => {
      applyTerritoryStyle(map);
      syncTerritories(map);
      syncRoutes(map);
      syncThemePaint(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (map.loaded()) {
      syncTerritories(map);
    } else {
      map.once('load', () => syncTerritories(map));
    }
  }, [territories]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    if (map.loaded()) {
      syncRoutes(map);
    } else {
      map.once('load', () => syncRoutes(map));
    }
  }, [routes]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.loaded()) {
      return;
    }

    syncThemePaint(map);
  }, [currentUser]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.loaded()) {
      return;
    }

    const nextStyle = isDarkTheme ? darkStyleUrl : lightStyleUrl;

    map.setStyle(nextStyle);
    map.once('style.load', () => {
      applyTerritoryStyle(map);
      syncTerritories(map);
      syncRoutes(map);
      syncThemePaint(map);
    });
  }, [isDarkTheme]);

  return (
    <div style={styles.shell}>
      <div ref={containerRef} style={styles.map} />
      {isSettingsOpen ? <button type="button" aria-label="Close settings" onClick={() => setIsSettingsOpen(false)} style={styles.backdrop} /> : null}
      {isSettingsOpen ? (
        <div style={styles.menu}>
          <div style={styles.menuHeader}>
            <div>
              <div style={styles.menuTitle}>Настройки</div>
              <div style={styles.menuSubtitle}>Карта и звук</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDarkTheme((current) => !current)}
            style={styles.menuItem}
          >
            <div>
              <div style={styles.menuItemTitle}>Тема карты</div>
              <div style={styles.menuItemDescription}>{isDarkTheme ? 'Dark Matter' : 'Voyager'}</div>
            </div>
            <div style={styles.menuToggle}>{isDarkTheme ? 'Темная' : 'Светлая'}</div>
          </button>

          <button
            type="button"
            onClick={() => setIsSoundEnabled((current) => !current)}
            style={styles.menuItem}
          >
            <div>
              <div style={styles.menuItemTitle}>Звук</div>
              <div style={styles.menuItemDescription}>Уведомления и эффекты</div>
            </div>
            <div style={styles.menuToggle}>{isSoundEnabled ? 'Вкл' : 'Выкл'}</div>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setIsSettingsOpen((current) => !current)}
        aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
        title={isSettingsOpen ? 'Закрыть настройки' : 'Открыть настройки'}
        style={styles.themeButton}
      >
        <span style={styles.themeButtonIcon}>⚙</span>
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  themeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
    width: 48,
    height: 48,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    background: 'rgba(10, 14, 24, 0.78)',
    color: '#f8fafc',
    display: 'grid',
    placeItems: 'center',
    boxShadow: '0 14px 30px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(14px)',
    cursor: 'pointer',
    transition: 'transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 999,
    border: 'none',
    background: 'transparent',
    cursor: 'default',
  },
  menu: {
    position: 'absolute',
    top: 72,
    right: 16,
    zIndex: 1001,
    width: 280,
    padding: 14,
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(9, 14, 24, 0.92)',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.42)',
    backdropFilter: 'blur(18px)',
    display: 'grid',
    gap: 10,
  },
  menuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  menuTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  menuSubtitle: {
    color: 'rgba(226, 232, 240, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#f8fafc',
    textAlign: 'left',
    cursor: 'pointer',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: 600,
  },
  menuItemDescription: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.68)',
  },
  menuToggle: {
    flexShrink: 0,
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
  },
  themeButtonIcon: {
    fontSize: 20,
    lineHeight: 1,
    transform: 'translateY(-0.5px)',
  },
};