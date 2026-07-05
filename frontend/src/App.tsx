import { useEffect, useState } from 'react';
import { MapArea, type TerritoryFeatureCollection } from './MapArea';

type TerritoryResponse = {
  id: string;
  owner_id: string;
  polygon: GeoJSON.Geometry;
};

function App() {
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [territories, setTerritories] = useState<TerritoryFeatureCollection | null>(null);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;

    if (!telegram) {
      return;
    }

    telegram.ready();
    telegram.expand();
    setTelegramId(telegram.initDataUnsafe?.user?.id ?? null);
  }, []);

  useEffect(() => {
    async function loadTerritories() {
      try {
        const response = await fetch('http://localhost:3000/api/territories');

        if (!response.ok) {
          throw new Error(`Failed to load territories: ${response.status}`);
        }

        const data = (await response.json()) as TerritoryResponse[];

        setTerritories({
          type: 'FeatureCollection',
          features: data.map((territory) => ({
            type: 'Feature',
            geometry: territory.polygon,
            properties: {
              id: territory.id,
              owner_id: territory.owner_id,
            },
          })),
        });
      } catch (error) {
        console.error(error);
        setTerritories({ type: 'FeatureCollection', features: [] });
      }
    }

    void loadTerritories();
  }, []);

  return (
    <main className="app-shell">
      <MapArea territories={territories} currentUserId={telegramId} />
      <div className="hud">
        <div className="hud__chip">Telegram ID: {telegramId ?? 'not available'}</div>
      </div>
    </main>
  );
}

export default App;
