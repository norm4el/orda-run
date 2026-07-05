import type { FeatureCollection } from 'geojson';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const karagandaCenter: [number, number] = [49.8019, 73.1021];

export type TerritoryFeatureCollection = FeatureCollection<
  GeoJSON.Geometry,
  { id: string; owner_id: string }
>;

type MapAreaProps = {
  territories: TerritoryFeatureCollection | null;
  currentUserId: number | null;
};

export function MapArea({ territories, currentUserId }: MapAreaProps) {
  const currentUserIdAsString = currentUserId === null ? null : String(currentUserId);

  return (
    <MapContainer
      center={karagandaCenter}
      zoom={14}
      zoomControl={false}
      scrollWheelZoom
      doubleClickZoom
      className="map-area"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {territories ? (
        <GeoJSON
          data={territories}
          style={(feature) => {
            const isMine = feature?.properties?.owner_id === currentUserIdAsString;

            return {
              color: isMine ? '#16a34a' : '#dc2626',
              weight: 2,
              opacity: 0.9,
              fillColor: isMine ? '#22c55e' : '#ef4444',
              fillOpacity: 0.2,
            };
          }}
        />
      ) : null}
    </MapContainer>
  );
}