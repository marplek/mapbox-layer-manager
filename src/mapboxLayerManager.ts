import mapboxgl, {
  Map as MapboxMap,
  MapboxOptions,
  Layer,
  AnyLayer,
  Source,
  Style,
  BackgroundLayer,
} from "mapbox-gl";

/**
 * Configuration options for MapboxLayerManager.
 */
interface MapboxLayerManagerOptions {
  mapboxgl: typeof mapboxgl;
  styles: Record<string, string | string[]>;
  mapboxAccessToken?: string | null;
  glyphs?: string | null;
  sprite?: string | null;
  customBlankStyle?: Partial<Style> | null;
}

/**
 * Options for creating a new map instance.
 */
interface CreateMapOptions {
  container: HTMLElement;
  options: MapboxOptions;
  defaultStyle: string;
}

/**
 * Manages Mapbox basemap layers by visibility.
 */
export class MapboxLayerManager {
  private _mapboxgl: {
    Map: typeof MapboxMap;
    accessToken: string | undefined;
  };
  private _styles: Record<string, string | string[]>;
  private _glyphsUrl: string;
  private _spriteUrl: string | null;
  private _customBlankStyle: Partial<Style> | null;
  private _addedLayerIds: Record<string, string[]>;
  private _originalAddLayer: MapboxMap["addLayer"] | null;
  private _layerInsertionOrder: Record<string, string>;

  /**
   * Creates an instance of MapboxLayerManager.
   * @param {MapboxLayerManagerOptions} options - Configuration options
   */
  constructor({
    mapboxgl,
    styles,
    mapboxAccessToken = null,
    glyphs = null,
    sprite = null,
    customBlankStyle = null,
  }: MapboxLayerManagerOptions) {
    this._mapboxgl = mapboxgl;
    this._styles = styles;
    this._mapboxgl.accessToken = mapboxAccessToken || "";
    this._glyphsUrl = glyphs || "mapbox://fonts/mapbox/{fontstack}/{range}.pbf";
    this._customBlankStyle = customBlankStyle;
    this._addedLayerIds = {};
    this._spriteUrl = sprite;
    this._originalAddLayer = null;
    this._layerInsertionOrder = {
      fill: "polygon-layer",
      "fill-extrusion": "polygon-layer",
      heatmap: "polygon-layer",
      background: "polygon-layer",
      raster: "polygon-layer",
      "raster-particle": "polygon-layer",
      line: "line-layer",
      symbol: "point-layer",
      circle: "point-layer",
    };
  }

  /**
   * Creates a new map instance.
   * @param {CreateMapOptions} options - Map creation options
   * @returns {Promise<MapboxMap>} A promise that resolves to a proxy object wrapping the Mapbox map instance
   */
  async createMap({
    container,
    options,
    defaultStyle,
  }: CreateMapOptions): Promise<MapboxMap> {
    const blankStyle = this._createBlankStyle();
    const mapboxMap = new this._mapboxgl.Map({
      style: blankStyle,
      ...options,
      container,
    });

    this._originalAddLayer = mapboxMap.addLayer.bind(mapboxMap);
    await new Promise<void>((resolve) => mapboxMap.on("load", () => resolve()));
    this._addIdentificationBlankLayer(mapboxMap);
    await this._loadBaseMapLayersVisible(mapboxMap, defaultStyle);

    const proxyMap = new Proxy(mapboxMap, {
      get: (target: MapboxMap, prop: PropertyKey) => {
        if (prop === "addLayer") {
          return this._interceptAddLayer(target);
        }
        if ((this as any)[prop]) {
          return (...args: any[]) => (this as any)[prop](target, ...args);
        }
        // @ts-ignore
        return target[prop];
      },
    });

    return proxyMap;
  }

  /**
   * Changes the current base map style.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {string} newStyle - The name of the new style to apply
   */
  changeBaseMap(map: MapboxMap, newStyle: string): void {
    if (!this._addedLayerIds[newStyle]) {
      this._addedLayerIds[newStyle] = [];
    }
    this._toggleBaseMapVisibility(map, newStyle);
  }

  /**
   * Adds a single layer to a specified basemap style.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {string} styleName - The name of the style to add the layer to
   * @param {Layer} layer - The layer object to add
   */
  addSingleLayerToBasemap(
    map: MapboxMap,
    styleName: string,
    layer: Layer
  ): void {
    if (!this._addedLayerIds[styleName]) {
      this._addedLayerIds[styleName] = [];
    }

    const newLayerId = `${styleName}-${layer.id}`;
    if (!map.getLayer(newLayerId)) {
      const layerToAdd = { ...layer, id: newLayerId } as AnyLayer;
      this._originalAddLayer!(layerToAdd, "base-map");
      this._addedLayerIds[styleName].push(newLayerId);

      const currentStyle = map.getStyle().name || "";
      const visibility = currentStyle === styleName ? "visible" : "none";
      map.setLayoutProperty(newLayerId, "visibility", visibility);
    }
  }

  /**
   * Gets the IDs of added layers.
   * @param {MapboxMap} map - The Mapbox map instance (not used in this method, but kept for consistency)
   * @returns {Record<string, string[]>} An object containing layer IDs grouped by style
   */
  getAddedLayerIds(map: MapboxMap): Record<string, string[]> {
    return this._addedLayerIds;
  }

  /**
   * Gets the current styles.
   * @param {MapboxMap} map - The Mapbox map instance (not used in this method, but kept for consistency)
   * @returns {Record<string, string | string[]>} The current styles object
   */
  getStyles(map: MapboxMap): Record<string, string | string[]> {
    return this._styles;
  }

  /**
   * Gets all layer IDs from the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @returns {string[]} An array of all layer IDs
   */
  getAllLayerIds(map: MapboxMap): string[] {
    return map.getStyle().layers?.map((layer) => layer.id) || [];
  }

  /**
   * Gets non-basemap layer IDs from the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @returns {string[]} An array of non-basemap layer IDs
   */
  getNonBasemapLayerIds(map: MapboxMap): string[] {
    const allLayers = map.getStyle().layers || [];
    const addedLayerIds = Object.values(this._addedLayerIds).flat();
    const indicatorLayers = [
      "base-map",
      "polygon-layer",
      "line-layer",
      "point-layer",
    ];

    return allLayers
      .filter(
        (layer) =>
          !addedLayerIds.includes(layer.id) &&
          !indicatorLayers.includes(layer.id)
      )
      .map((layer) => layer.id);
  }

  /**
   * Gets visible layer IDs from the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @returns {string[]} An array of visible layer IDs
   */
  getVisibleLayerIds(map: MapboxMap): string[] {
    return (map.getStyle().layers || [])
      .filter(
        (layer) => map.getLayoutProperty(layer.id, "visibility") !== "none"
      )
      .map((layer) => layer.id);
  }

  /**
   * Gets visible non-basemap layer IDs from the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @returns {string[]} An array of visible non-basemap layer IDs
   */
  getVisibleNonBasemapLayerIds(map: MapboxMap): string[] {
    const allLayers = map.getStyle().layers || [];
    const addedLayerIds = Object.values(this._addedLayerIds).flat();
    const indicatorLayers = [
      "base-map",
      "polygon-layer",
      "line-layer",
      "point-layer",
    ];

    return allLayers
      .filter((layer) => {
        const isNonBasemap =
          !addedLayerIds.includes(layer.id) &&
          !indicatorLayers.includes(layer.id);
        const visibility = map.getLayoutProperty(layer.id, "visibility");
        const isVisible = visibility !== "none";
        return isNonBasemap && isVisible;
      })
      .map((layer) => layer.id);
  }

  /**
   * Prints the order of layers in the map, grouped by layer type.
   * This method is useful for debugging and understanding the current state of the map's layers.
   *
   * @param {MapboxMap} map - The Mapbox map instance
   * @public
   */
  printLayerOrder(map: MapboxMap): void {
    const layers = map.getStyle().layers || [];
    const layerGroups: Record<string, string[]> = {
      basemap: [],
      point: [],
      line: [],
      polygon: [],
    };

    const addedLayerIds = Object.values(this._addedLayerIds).flat();

    layers.forEach((layer) => {
      if (addedLayerIds.includes(layer.id)) {
        layerGroups.basemap.push(layer.id);
      } else if (this._isPointLayer(layer)) {
        layerGroups.point.push(layer.id);
      } else if (this._isLineLayer(layer)) {
        layerGroups.line.push(layer.id);
      } else if (this._isPolygonLayer(layer)) {
        layerGroups.polygon.push(layer.id);
      }
    });

    console.log("Layer Order:");
    console.log("Basemap layers:", layerGroups.basemap.join(", "));
    console.log("Polygon layers:", layerGroups.polygon.join(", "));
    console.log("Line layers:", layerGroups.line.join(", "));
    console.log("Point layers:", layerGroups.point.join(", "));
  }

  /**
   * Loads base map layers for a specific style.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {string} styleName - The name of the style to load
   * @returns {Promise<void>}
   * @private
   */
  private async _loadBaseMapLayers(
    map: MapboxMap,
    styleName: string
  ): Promise<void> {
    if (!this._addedLayerIds[styleName]) {
      this._addedLayerIds[styleName] = [];
    }
    const mapStyle = await this._fetchStyle(styleName);
    this._addSourcesAndLayers(map, mapStyle, styleName);
  }

  /**
   * Loads base map layers and sets visibility based on the default style.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {string} defaultStyle - The name of the default style
   * @returns {Promise<void>}
   * @private
   */
  private async _loadBaseMapLayersVisible(
    map: MapboxMap,
    defaultStyle: string
  ): Promise<void> {
    for (const styleName of Object.keys(this._styles)) {
      await this._loadBaseMapLayers(map, styleName);
      if (styleName !== defaultStyle) {
        this._addedLayerIds[styleName].forEach((layerId) => {
          map.setLayoutProperty(layerId, "visibility", "none");
        });
      }
    }
  }

  /**
   * Toggles the visibility of base map layers.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {string} activeStyle - The name of the active style
   * @private
   */
  private _toggleBaseMapVisibility(map: MapboxMap, activeStyle: string): void {
    Object.keys(this._addedLayerIds).forEach((styleName) => {
      const isVisible = styleName === activeStyle;
      this._addedLayerIds[styleName].forEach((layerId) => {
        map.setLayoutProperty(
          layerId,
          "visibility",
          isVisible ? "visible" : "none"
        );
      });
    });
  }

  /**
   * Creates a blank style object.
   * @returns {Style} The blank style object
   * @private
   */
  private _createBlankStyle(): Style {
    const defaultBlankStyle: Style = {
      version: 8,
      name: "BlankMap",
      sources: {},
      layers: [],
      glyphs: this._glyphsUrl,
      sprite: this._spriteUrl || "",
    };

    if (this._customBlankStyle) {
      return {
        ...defaultBlankStyle,
        ...this._customBlankStyle,
      };
    } else {
      return defaultBlankStyle;
    }
  }

  /**
   * Fetches and merges styles for a given style name.
   * @param {string} styleName - The name of the style to fetch
   * @returns {Promise<Style>} A promise that resolves to the merged style object
   * @private
   */
  private async _fetchStyle(styleName: string): Promise<Style> {
    try {
      const urls = Array.isArray(this._styles[styleName])
        ? (this._styles[styleName] as string[])
        : [this._styles[styleName] as string];
      const styleData: Style[] = await Promise.all(
        urls.map(async (url) => {
          if (
            url.includes("wmts") ||
            url.endsWith(".png") ||
            url.endsWith(".jpg")
          ) {
            return {
              version: 8,
              sources: {
                [styleName]: {
                  type: "raster",
                  tiles: [url],
                  tileSize: 256,
                },
              },
              layers: [
                {
                  id: styleName,
                  type: "raster",
                  source: styleName,
                  minzoom: 0,
                  maxzoom: 22,
                },
              ],
            };
          } else {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = await response.json();
            return json as Style;
          }
        })
      );

      return this._mergeStyles(styleData);
    } catch (error) {
      console.error(`Error fetching style for ${styleName}:`, error);
      throw error;
    }
  }

  /**
   * Merges multiple style objects into one.
   * @param {Style[]} styleData - An array of style objects to merge
   * @returns {Style} The merged style object
   * @private
   */
  private _mergeStyles(styleData: Style[]): Style {
    let mergedStyle: Style = { ...styleData[0] };
    for (let i = 1; i < styleData.length; i++) {
      mergedStyle.layers = [
        ...(mergedStyle.layers || []),
        ...(styleData[i].layers || []),
      ];
      mergedStyle.sources = {
        ...(mergedStyle.sources || {}),
        ...(styleData[i].sources || {}),
      };
    }
    return mergedStyle;
  }

  /**
   * Adds sources and layers from a style to the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {Style} mapStyle - The style object containing sources and layers
   * @param {string} styleName - The name of the style being added
   * @private
   */
  private _addSourcesAndLayers(
    map: MapboxMap,
    mapStyle: Style,
    styleName: string
  ): void {
    this._addSources(map, mapStyle.sources);
    this._addLayers(map, mapStyle.layers || [], styleName);
  }

  /**
   * Adds sources to the map if they don't already exist.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {Record<string, Source>} sources - The sources to add
   * @private
   */
  private _addSources(map: MapboxMap, sources: Record<string, Source>): void {
    Object.entries(sources).forEach(([sourceName, sourceData]) => {
      if (!map.getSource(sourceName)) {
        map.addSource(sourceName, sourceData as any);
      }
    });
  }

  /**
   * Adds layers to the map with a specific style name prefix.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {AnyLayer[]} layers - The layers to add
   * @param {string} styleName - The style name to prefix layer IDs with
   * @private
   */
  private _addLayers(
    map: MapboxMap,
    layers: AnyLayer[],
    styleName: string
  ): void {
    layers.forEach((layer) => {
      const newLayerId = `${styleName}-${layer.id}`;

      if (!map.getLayer(newLayerId)) {
        try {
          const layerToAdd: AnyLayer = { ...layer, id: newLayerId };
          this._originalAddLayer!(layerToAdd, "base-map");
          this._addedLayerIds[styleName].push(newLayerId);
        } catch (error) {
          console.warn(`Failed to add layer ${newLayerId}:`, error);
        }
      }
    });
  }

  /**
   * Adds identification blank layers to the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @private
   */
  private _addIdentificationBlankLayer(map: MapboxMap): void {
    this._addBlankBackgroundLayer(map, "base-map");
    this._addBlankBackgroundLayer(map, "polygon-layer");
    this._addBlankBackgroundLayer(map, "line-layer");
    this._addBlankBackgroundLayer(map, "point-layer");
  }

  /**
   * Adds a blank background layer to the map.
   * @param {MapboxMap} map - The Mapbox map instance
   * @param {string} layerId - The ID for the blank layer
   * @private
   */
  private _addBlankBackgroundLayer(map: MapboxMap, layerId: string): void {
    if (!map.getLayer(layerId)) {
      const blankBackgroundLayer: BackgroundLayer = {
        id: layerId,
        type: "background",
        paint: {
          "background-color": "rgba(255, 255, 255, 0)",
        },
      };
      map.addLayer(blankBackgroundLayer);
    }
  }

  /**
   * Creates an interceptor for the addLayer method.
   * @param {MapboxMap} target - The original Mapbox map instance
   * @returns {Function} The interceptor function
   * @private
   */
  private _interceptAddLayer(
    target: MapboxMap
  ): (layer: AnyLayer, before?: string | undefined) => void {
    return (layer: AnyLayer, before?: string) => {
      const insertBeneathId = this._getInsertBeneathId(layer, before);
      this._originalAddLayer!(layer, insertBeneathId);
    };
  }

  /**
   * Gets the ID of the layer beneath which a new layer should be inserted.
   * @param {AnyLayer} layer - The layer to be inserted
   * @param {string | undefined} beneathId - The ID of the layer to insert beneath, if specified
   * @returns {string | undefined} The ID of the layer beneath which to insert the new layer
   * @private
   */
  private _getInsertBeneathId(
    layer: AnyLayer,
    beneathId?: string
  ): string | undefined {
    if (beneathId === "null" || beneathId === "undefined" || beneathId === "") {
      return undefined;
    }
    if (beneathId) return beneathId;

    const layerType = layer.type;
    return this._layerInsertionOrder[layerType] || "polygon-layer";
  }

  /**
   * Checks if the layer is a point layer.
   * @param {AnyLayer} layer - The layer to check
   * @returns {boolean} True if the layer is a point layer, false otherwise
   * @private
   */
  private _isPointLayer(layer: AnyLayer): boolean {
    return this._layerInsertionOrder[layer.type] === "point-layer";
  }

  /**
   * Checks if the layer is a line layer.
   * @param {AnyLayer} layer - The layer to check
   * @returns {boolean} True if the layer is a line layer, false otherwise
   * @private
   */
  private _isLineLayer(layer: AnyLayer): boolean {
    return this._layerInsertionOrder[layer.type] === "line-layer";
  }

  /**
   * Checks if the layer is a polygon layer.
   * @param {AnyLayer} layer - The layer to check
   * @returns {boolean} True if the layer is a polygon layer, false otherwise
   * @private
   */
  private _isPolygonLayer(layer: AnyLayer): boolean {
    return this._layerInsertionOrder[layer.type] === "polygon-layer";
  }
}

export default MapboxLayerManager;
