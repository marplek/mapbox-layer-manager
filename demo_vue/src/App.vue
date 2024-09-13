<template>
  <div id="layout">
    <div id="sidebar">
      <div>
        <button @click="changeStyle('streets')">Streets</button>
        <button @click="changeStyle('satellite')">Satellite</button>
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
  streets: import.meta.env.VITE_mapboxStyle,
  satellite: import.meta.env.VITE_satelliteStyle,
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

onMounted(async () => {
  map = await mapboxLayerManager.createMap({
    container: mapContainer.value,
    options: {
      center: [121.509, 25.052],
      bearing: 0,
      pitch: 0,
      zoom: 15
    },
    defaultStyle: 'streets',
  });
  map.addControl(new mapboxgl.NavigationControl());
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
