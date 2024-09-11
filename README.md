# Mapbox Basemap Visibility

A utility for managing Mapbox basemap layers visibility.

## Installation

```bash
npm install mapbox-layer-manager
```

## Usage

```javascript
import mapboxLayerManager from "mapbox-layer-manager";

const manager = new mapboxLayerManager({
  mapboxgl: mapboxgl,
  styles: ["mapbox://styles/mapbox/streets-v11"],
});
```

