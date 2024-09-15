# MapboxLayerManager

## 簡介

MapboxLayerManager 是一個專為 Mapbox GL JS 設計的圖層管理工具。它解決了 Mapbox 原生 `setStyle` 方法在切換樣式時丟失自定義圖層的問題，同時提供了一套靈活的 API 來管理地圖圖層。這個工具的設計理念與常見的地圖 API 架構相似，使得開發者可以更直觀地操作和管理地圖圖層。

## 主要特性

1. **類似傳統地圖 API 的架構**
   Mapbox GL JS 原生不區分底圖和疊加圖層,所有圖層都是 style 的一部分。本套件通過控制圖層可見性,模擬了傳統地圖 API 的分層結構,使 Mapbox GL JS 的使用更加直觀。

2. **優化 setStyle 功能**
   解決了原生 `setStyle` 方法在切換底圖樣式時丟失自定義圖層的問題。本套件在切換樣式時保留自定義圖層,同時保持其他 Mapbox GL JS 原生方法的一致性。

3. **指示圖層機制**：
   引入特殊的指示圖層(base-map, polygon-layer, line-layer, point-layer),實現新添加圖層根據類型自動插入到適當位置的功能。

4. **在一個地圖中加載多個style.json設定檔圖層**： 
   支持在單一地圖實例中加載和管理多個 style.json 配置文件,增強了地圖的靈活性和功能豐富度。

## 工作原理

1. **樣式切換**
   當切換基礎地圖樣式時，MapboxLayerManager 只是切換了相應圖層的可見性，而不是重新加載整個樣式。這保證了自定義圖層的保留。

2. **圖層插入順序**
   通過攔截 `map.addLayer` 方法，MapboxLayerManager 確保新添加的圖層被插入到正確的位置。這是基於預定義的圖層類型順序實現的。


## 注意事項

- Mapbox 地圖只能載入一次 sprite。加載多個 style.json 時,需要合併 sprite，一次加載所有 sprite。對於 SVG 格式,可使用官方工具 [spritezero](https://github.com/mapbox/spritezero) 轉換為所需的 PNG 和 JSON 格式。
- 使用本套件時,不建議使用 `map.import()` 和 `map.setConfigProperty()` 方法,以避免潛在的衝突。
- 無法使用'mapbox://styles/'開頭的style.json,須找到原始的url。

## 安裝

```bash
npm install mapbox-layer-manager
```

## 基本使用



```javascript
### 初始化
import MapboxLayerManager from "mapbox-layer-manager";

const mapboxLayerManager = new MapboxLayerManager({
  mapboxgl: mapboxgl,
  styles: {
    streets: import.meta.env.VITE_mapboxStreets,
    satellite: import.meta.env.VITE_satelliteStyle,
  },
  mapboxAccessToken: "your-mapbox-access-token",
  sprite: "your-sprite-url",
});

### 創建地圖
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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project depends on Mapbox Web SDK. Use of Mapbox Web SDK is subject to the [Mapbox Terms of Service](https://www.mapbox.com/legal/tos/). Users of this software must ensure they comply with Mapbox's terms when using functionality that relies on Mapbox Web SDK.
