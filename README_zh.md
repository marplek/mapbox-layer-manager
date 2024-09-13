# MapboxLayerManager

## 簡介

MapboxLayerManager 是一個專為 Mapbox GL JS 設計的圖層管理工具。它解決了 Mapbox 原生 `setStyle` 方法在切換樣式時丟失自定義圖層的問題，同時提供了一套靈活的 API 來管理地圖圖層。這個工具的設計理念與常見的地圖 API 架構相似，使得開發者可以更直觀地操作和管理地圖圖層。

## 主要特性

1. **與一般地圖api相似的架構**
Mapbox GL JS 沒有底圖與其他圖層的概念，所有圖層都是同一個實體的一部分：style。這個套件只是切換了相應圖層的可見性，使mapboxgl 更符合一般地圖api的架構。

2. **解決 setStyle 問題**：在切換基礎地圖樣式時保留自定義圖層，避免了使用原生 `setStyle` 方法導致的圖層與資源丟失。其餘方法皆與原生mapboxgl一致。

3. **指示圖層機制**：建立了特殊的指示圖層（base-map, polygon-layer, line-layer, point-layer），使得新添加的圖層可以根據其類型自動插入到正確的位置。

4. **在一個地圖中加載多個style.json設定檔圖層**：

## 工作原理

1. **樣式切換**：當切換基礎地圖樣式時，MapboxLayerManager 只是切換了相應圖層的可見性，而不是重新加載整個樣式。這保證了自定義圖層的保留。

2. **圖層插入順序**：通過攔截 `map.addLayer` 方法，MapboxLayerManager 確保新添加的圖層被插入到正確的位置。這是基於預定義的圖層類型順序實現的。

## 注意事項

- 使用自定義 sprite 時，確保它包含了您需要的所有圖標。
- 使用這個套件時，不宜使用map.import()、map.setConfigProperty。
- Sprite 資源管理：支持自定義 sprite URL
https://github.com/mapbox/spritezero

## 安裝

```bash
npm install mapbox-layer-manager
```

## 基本使用

### 初始化

```javascript
import MapboxLayerManager from "mapbox-layer-manager";

const mapboxLayerManager = new MapboxLayerManager({
  mapboxgl: mapboxgl,
  styles: {
    streets: import.meta.env.VITE_mapboxStreets,
    satellite: import.meta.env.VITE_satelliteStyle,
  },
  mapboxAccessToken: "your-mapbox-access-token",
});
```

### 創建地圖

```javascript
const map = await mapboxLayerManager.createMap({
  container: "map",
  options: {
    center: [121.5, 25.05],
    zoom: 15,
  },
  defaultStyle: "streets",
});
```

### 切換基礎地圖

```javascript
map.changeBaseMap("satellite");
```

### 添加自定義圖層

```javascript
map.addLayer({
  id: "custom-layer",
  type: "circle",
  source: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [121.5, 25.05],
          },
        },
      ],
    },
  },
  paint: {
    "circle-color": "#000",
    "circle-radius": 10,
  },
});
```

這個自定義圖層會自動插入到正確的位置，無需手動指定。

### 不使用指示圖層

```javascript
map.addLayer({
  id: "custom-layer",
  type: "circle",
  source: {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [121.5, 25.05],
          },
        },
      ],
    },
  },
  paint: {
    "circle-color": "#000",
    "circle-radius": 10,
  },
});
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project depends on Mapbox Web SDK. Use of Mapbox Web SDK is subject to the [Mapbox Terms of Service](https://www.mapbox.com/legal/tos/). Users of this software must ensure they comply with Mapbox's terms when using functionality that relies on Mapbox Web SDK.
