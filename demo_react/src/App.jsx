import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxLayerManager } from 'mapbox-layer-manager';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const styles = {
  streets: import.meta.env.VITE_mapboxStyle,
  satellite: import.meta.env.VITE_satelliteStyle,
};

function App() {
  const mapContainer = useRef(null);
  const [map, setMap] = useState(null);
  const mapboxLayerManager = useRef(null);

  useEffect(() => {
    mapboxLayerManager.current = new MapboxLayerManager({
      mapboxgl: mapboxgl,
      styles: styles,
      mapboxAccessToken: import.meta.env.VITE_mapboxAccessToken,
      sprite: "mapbox://sprites/mapbox/streets-v12",
      glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    });

    const initializeMap = async () => {
      const newMap = await mapboxLayerManager.current.createMap({
        container: mapContainer.current,
        options: {
          center: [121.509, 25.052],
          bearing: 0,
          pitch: 0,
          zoom: 15
        },
        defaultStyle: 'streets',
      });
      newMap.addControl(new mapboxgl.NavigationControl());
      setMap(newMap);
    };

    initializeMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  const changeStyle = (style) => {
    if (map) {
      map.changeBaseMap(style);
    }
  };

  return (
    <div id="layout">
      <div id="sidebar">
        <div>
          <button onClick={() => changeStyle('streets')}>Streets</button>
          <button onClick={() => changeStyle('satellite')}>Satellite</button>
        </div>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default App;

