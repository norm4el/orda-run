import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getRankFromPoints } from './utils/ranks';
import { area } from '@turf/area';
import { polygon } from '@turf/helpers';
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
const emptyRoutesData: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const liveRouteSourceId = 'live-route-source';
const liveRouteLayerId = 'live-route-layer';
const livePointLayerId = 'live-point-layer';

const plannedRouteSourceId = 'planned-route-source';
const plannedFillLayerId = 'planned-fill-layer';
const plannedLineLayerId = 'planned-line-layer';

export type TerritoryFeatureCollection = FeatureCollection<
  Geometry,
  { id: string; owner_id: string; owner_orda_id: string | null; owner_display_name: string | null; owner_influence_points: number }
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
  isDarkTheme?: boolean;
  isDrawingMode?: boolean;
  onPlannedAreaChange?: (area: number | null) => void;
  onPlannedPointsChange?: (points: [number, number][]) => void;
};

export function MapArea({ territories, routes, currentUser, liveCoordinates, ordaMode = false, isDarkTheme = true, isDrawingMode = false, onPlannedAreaChange, onPlannedPointsChange }: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const territoriesRef = useRef<TerritoryFeatureCollection | null>(territories);
  const routesRef = useRef<RouteFeatureCollection | null>(routes);
  const currentUserRef = useRef<AuthenticatedUser | null>(currentUser);
  const liveCoordinatesRef = useRef<[number, number][] | undefined>(liveCoordinates);

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

  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const isDrawingModeRef = useRef<boolean>(isDrawingMode);
  const onPlannedAreaChangeRef = useRef(onPlannedAreaChange);

  useEffect(() => {
    isDrawingModeRef.current = isDrawingMode;
    if (!isDrawingMode) {
      setDrawnPoints([]);
      onPlannedAreaChangeRef.current?.(null);
    }
  }, [isDrawingMode]);

  useEffect(() => {
    onPlannedAreaChangeRef.current = onPlannedAreaChange;
  }, [onPlannedAreaChange]);

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
          data: {
            ...territoriesRef.current!,
            features: (territoriesRef.current?.features || []).map(f => ({
              ...f,
              properties: {
                ...f.properties,
                displayNameWithRank: `${f.properties?.owner_display_name || 'Игрок'}\n[${getRankFromPoints(f.properties?.owner_influence_points || 0).title}]`
              }
            }))
          }
        });
    }

    const colorSelf = currentUserRef.current?.colorSelf ?? '#d8a760'; // User chosen color or Gold
    const colorOthers = '#2c5a5a'; // Teal
    const colorOrda = '#22c55e'; // Green for own Orda members
    
    const ownerMatch = currentUserRef.current?.id ?? '__none__';
    const ordaMatch = currentUserRef.current?.ordaId ?? '__none__';
    const isOrdaMode = ordaModeRef.current;

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

    const territorySymbolLayerId = 'territories-symbol';
    if (!map.getLayer(territorySymbolLayerId)) {
      map.addLayer({
        id: territorySymbolLayerId,
        type: 'symbol',
        source: territorySourceId,
        layout: {
          'text-field': ['get', 'displayNameWithRank'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-anchor': 'center',
          'text-justify': 'center',
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });
    }

    if (!map.getSource(routesSourceId)) {
      map.addSource(routesSourceId, {
        type: 'geojson',
        data: routesRef.current ?? emptyRoutesData,
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

    if (!map.getSource(plannedRouteSourceId)) {
      map.addSource(plannedRouteSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }

    if (!map.getLayer(plannedFillLayerId)) {
      map.addLayer({
        id: plannedFillLayerId,
        type: 'fill',
        source: plannedRouteSourceId,
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.3,
        },
        filter: ['==', '$type', 'Polygon'],
      });
    }

    if (!map.getLayer(plannedLineLayerId)) {
      map.addLayer({
        id: plannedLineLayerId,
        type: 'line',
        source: plannedRouteSourceId,
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
        filter: ['any', ['==', '$type', 'Polygon'], ['==', '$type', 'LineString']],
      });
    }

    if (!map.getLayer('3d-buildings')) {
      const layers = map.getStyle().layers;
      let labelLayerId;
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i] as any;
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          labelLayerId = layer.id;
          break;
        }
      }
      
      try {
        // Many styles use 'building' source layer from 'openmaptiles' or similar
        // We need to guess the source name if not known, often it's 'openmaptiles' or the primary source
        const sources = Object.keys(map.getStyle().sources);
        const vectorSource = sources.find(s => map.getSource(s)?.type === 'vector');
        if (vectorSource) {
          map.addLayer({
            id: '3d-buildings',
            source: vectorSource,
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'render_height'],
              'fill-extrusion-base': ['get', 'render_min_height'],
              'fill-extrusion-opacity': 0.6
            }
          }, labelLayerId);
        }
      } catch (e) {
        console.log("3D buildings not supported by current basemap style", e);
      }
    }
  };

  const syncTerritories = (map: maplibregl.Map) => {
    const source = map.getSource(territorySourceId) as maplibregl.GeoJSONSource | undefined;
    const data = territoriesRef.current;
    
    if (source && data) {
      source.setData({
        ...data,
        features: data.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            displayNameWithRank: `${f.properties?.owner_display_name || 'Игрок'}\n[${getRankFromPoints(f.properties?.owner_influence_points || 0).title}]`
          }
        }))
      });
    } else if (source) {
      source.setData(emptyTerritoryData);
    }
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

  const syncPlannedRoute = (map: maplibregl.Map, points: [number, number][]) => {
    const source = map.getSource(plannedRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features: any[] = [];

    // Points
    for (const point of points) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point,
        },
        properties: {},
      });
    }

    if (points.length >= 3) {
      // Create closed polygon
      const closedPoints = [...points, points[0]];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [closedPoints],
        },
        properties: {},
      });
      try {
        const poly = polygon([closedPoints]);
        const calcArea = area(poly);
        onPlannedAreaChangeRef.current?.(calcArea);
      } catch (e) {
        onPlannedAreaChangeRef.current?.(null);
      }
    } else if (points.length === 2) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: points,
        },
        properties: {},
      });
      onPlannedAreaChangeRef.current?.(null);
    } else {
      onPlannedAreaChangeRef.current?.(null);
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  };

  useEffect(() => {
    if (mapRef.current) {
      syncPlannedRoute(mapRef.current, drawnPoints);
    }
    onPlannedPointsChange?.(drawnPoints);
  }, [drawnPoints, onPlannedPointsChange]);

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
      syncPlannedRoute(map, drawnPoints);
    });

    let isDragging = false;
    let lastPointTime = 0;

    const startDrawing = (lngLat: maplibregl.LngLat) => {
      if (!isDrawingModeRef.current) return;
      isDragging = true;
      map.dragPan.disable();
      setDrawnPoints((prev: [number, number][]) => [...prev, [lngLat.lng, lngLat.lat]]);
    };

    const moveDrawing = (lngLat: maplibregl.LngLat) => {
      if (!isDrawingModeRef.current || !isDragging) return;
      const now = Date.now();
      if (now - lastPointTime < 30) return;
      lastPointTime = now;
      
      setDrawnPoints((prev: [number, number][]) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = Math.hypot(last[0] - lngLat.lng, last[1] - lngLat.lat);
          if (dist < 0.0001) return prev;
        }
        return [...prev, [lngLat.lng, lngLat.lat]];
      });
    };

    const endDrawing = () => {
      if (!isDrawingModeRef.current) return;
      isDragging = false;
      map.dragPan.enable();
    };

    const onMouseDown = (e: maplibregl.MapMouseEvent) => startDrawing(e.lngLat);
    const onMouseMove = (e: maplibregl.MapMouseEvent) => moveDrawing(e.lngLat);
    const onMouseUp = () => endDrawing();
    
    const onTouchStart = (e: maplibregl.MapTouchEvent) => startDrawing(e.lngLat);
    const onTouchMove = (e: maplibregl.MapTouchEvent) => moveDrawing(e.lngLat);
    const onTouchEnd = () => endDrawing();

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('touchstart', onTouchStart);
    map.on('touchmove', onTouchMove);
    map.on('touchend', onTouchEnd);
    map.on('touchcancel', onTouchEnd);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('touchstart', onTouchStart);
      map.off('touchmove', onTouchMove);
      map.off('touchend', onTouchEnd);
      map.off('touchcancel', onTouchEnd);
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
      syncPlannedRoute(map, drawnPoints);
    });
  }, [isDarkTheme]);

  return (
    <div style={styles.shell}>
      <div ref={containerRef} style={styles.map} />
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
};