<template>
  <div id="layout">
    <div id="sidebar">
      <div>
        <button @click="changeStyle('streets')">Streets</button>
        <button @click="changeStyle('satellite')">Satellite</button>
        <button @click="changeStyle('stdJP')">std JP</button>
      </div>
    </div>
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import mapboxgl from 'mapbox-gl';
import { MapboxLayerManager } from 'mapbox-layer-manager';
import 'mapbox-gl/dist/mapbox-gl.css';

const styles = {
  streets: `${import.meta.env.VITE_mapboxStyle}${import.meta.env.VITE_mapboxAccessToken}`,
  satellite: [
    `${import.meta.env.VITE_satelliteStyle}${import.meta.env.VITE_mapboxAccessToken}`,
    import.meta.env.VITE_STREETS_ROAD_URL
  ],
  stdJP: import.meta.env.VITE_stdJP
};

const mapContainer = ref(null);
let map = null;
const mapboxLayerManager = new MapboxLayerManager({
  mapboxgl: mapboxgl,
  styles: styles,
  mapboxAccessToken: import.meta.env.VITE_mapboxAccessToken,
  sprite: "mapbox://sprites/mapbox/streets-v12",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
});

const addLayers = () => {
  map.addLayer({
    id: 'lineLayer2',
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [139.756542, 35.679126],
            [139.755542, 35.681126],
          ]
        }
      }
    },
    paint: {
      'line-color': '#0000ff',
      'line-width': 3
    }
  }, 'null');
  map.addLayer({
    id: 'pointLayer',
    type: 'circle',
    source: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [139.755542, 35.681126]
          }
        }]
      }
    },
    paint: {
      'circle-radius': 10,
      'circle-color': '#ff0000'
    }
  });

  map.addLayer({
    id: 'lineLayer',
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [139.757542, 35.681126],
            [139.755542, 35.681126],
          ]
        }
      }
    },
    paint: {
      'line-color': '#0000ff',
      'line-width': 3
    }
  });

  map.addLayer({
    id: 'polygonLayer',
    type: 'fill',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [139.753542, 35.680126],
            [139.759542, 35.681126],
            [139.755542, 35.684126],
            [139.753542, 35.680126]
          ]]
        }
      }
    },
    paint: {
      'fill-color': '#00ff00',
      'fill-opacity': 0.5
    }
  });



  map.addSingleLayerToBasemap('satellite',
    {
      id: 'countours',
      type: 'line',
      source: {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      },
      'source-layer': 'contour',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        // 'line-color': "hsl(60, 10%, 35%)",
        'line-color': '#473B24',
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          ['match', ['get', 'index'], [1, 2], 0.15, 0.3],
          13,
          ['match', ['get', 'index'], [1, 2], 0.3, 0.5],
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13,
          ['match', ['get', 'index'], [1, 2], 0.5, 0.6],
          16,
          ['match', ['get', 'index'], [1, 2], 0.8, 1.2],
        ],
      },
    });
  map.addSingleLayerToBasemap('satellite',
    {
      id: 'countour-labels',
      type: 'symbol',
      source: {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      },
      'source-layer': 'contour',
      layout: {
        'symbol-placement': 'line',
        'text-field': ['concat', ['to-string', ['get', 'ele']], 'm'],
      },
      layout: {
        'text-field': ['concat', ['get', 'ele'], ' m'],
        'symbol-placement': 'line',
        'text-pitch-alignment': 'viewport',
        'text-max-angle': 25,
        'text-padding': 5,
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 15, 9.5, 20, 12],

      },
      paint: {
        'text-color': 'hsl(60, 10%, 35%)',
        'text-halo-width': 1,
        'text-halo-color': 'hsl(60, 10%, 85%)',
      },
      filter: [
        'any',
        ['==', ['get', 'index'], 10],
        ['==', ['get', 'index'], 5],
      ],
    });
};

onMounted(async () => {
  map = await mapboxLayerManager.createMap({
    container: mapContainer.value,
    options: {
      center: [139.755542, 35.681126],
      bearing: 0,
      pitch: 0,
      zoom: 15
    },
    defaultStyle: 'streets',
  });
  map.addControl(new mapboxgl.NavigationControl());
  addLayers();
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

const changeStyle = (style) => {
  map.changeBaseMap(style);
};
</script>

<style>
#layout {
  flex: 1;
  display: flex;
}

.map-container {
  flex: 1;
}

#sidebar {
  background-color: rgb(35 55 75 / 90%);
  color: #fff;
  padding: 6px 12px;
  font-family: monospace;
  z-index: 1;
  position: absolute;
  top: 0;
  left: 20px;
  margin: 12px;
  border-radius: 4px;
}
</style>
