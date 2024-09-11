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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project depends on Mapbox Web SDK. Use of Mapbox Web SDK is subject to the [Mapbox Terms of Service](https://www.mapbox.com/legal/tos/). Users of this software must ensure they comply with Mapbox's terms when using functionality that relies on Mapbox Web SDK.
