/**
 * Manages Mapbox basemap layers by visibility.
 */
export class MapboxLayerManager {
  /**
   * Creates an instance of MapboxBasemapVisibility.
   * @param {Object} options - Configuration options
   * @param {Object} options.mapboxgl - Mapbox GL JS library
   * @param {Object} options.styles - Map styles
   * @param {string} [options.mapboxAccessToken] - Custom Mapbox access token
   * @param {string} [options.glyphs] - Custom glyphs URL
   * @param {string} [options.sprite] - Custom sprite URL
   * @param {Object} [options.customBlankStyle] - Custom blank style
   */
  constructor({
    mapboxgl,
    styles,
    mapboxAccessToken = null,
    glyphs = null,
    sprite = null,
    customBlankStyle = null,
  }) {
    this._mapboxgl = mapboxgl;
    this._styles = styles;
    this._mapboxgl.accessToken =
      mapboxAccessToken || import.meta.env.VITE_mapboxAccessToken;
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
   * @param {Object} options - Map creation options
   * @param {HTMLElement} options.container - The container element
   * @param {Object} options.options - Mapbox GL JS options
   * @param {string} options.defaultStyle - Default style name
   * @returns {Promise<Object>} A promise that resolves to a proxy object wrapping the Mapbox map instance
   */
  async createMap({ container, options, defaultStyle }) {
    const blankStyle = this._createBlankStyle();
    const mapboxMap = new this._mapboxgl.Map({
      container,
      style: blankStyle,
      ...options,
    });

    this._originalAddLayer = mapboxMap.addLayer.bind(mapboxMap);
    await new Promise((resolve) => mapboxMap.on("load", resolve));
    this._addIdentificationBlankLayer(mapboxMap);
    await this._loadBaseMapLayersVisible(mapboxMap, defaultStyle);

    const proxyMap = new Proxy(mapboxMap, {
      get: (target, prop) => {
        if (prop === "addLayer") {
          return this._interceptAddLayer(target);
        }
        if (prop in this) {
          return (...args) => this[prop](target, ...args);
        }
        return target[prop];
      },
    });

    return proxyMap;
  }

  /**
   * Changes the current base map style.
   * @param {Object} map - The Mapbox map instance
   * @param {string} newStyle - The name of the new style to apply
   * @returns {Promise<void>}
   */
  async changeBaseMap(map, newStyle) {
    if (!this._addedLayerIds[newStyle]) {
      this._addedLayerIds[newStyle] = [];
    }
    this._toggleBaseMapVisibility(map, newStyle);
  }

  /**
   * Gets the IDs of added layers.
   * @param {Object} map - The Mapbox map instance (not used in this method, but kept for consistency)
   * @returns {Object} An object containing layer IDs grouped by style
   */
  getAddedLayerIds(map) {
    return this._addedLayerIds;
  }

  /**
   * Gets the current styles.
   * @param {Object} map - The Mapbox map instance (not used in this method, but kept for consistency)
   * @returns {Object} The current styles object
   */
  getStyles(map) {
    return this._styles;
  }

  /**
   * Gets all layer IDs from the map.
   * @param {Object} map - The Mapbox map instance
   * @returns {Array<string>} An array of all layer IDs
   */
  getAllLayerIds(map) {
    return map.getStyle().layers.map((layer) => layer.id);
  }

  /**
   * Gets non-basemap layer IDs from the map.
   * @param {Object} map - The Mapbox map instance
   * @returns {Array<string>} An array of non-basemap layer IDs
   */
  getNonBasemapLayerIds(map) {
    const allLayers = map.getStyle().layers;
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
   * @param {Object} map - The Mapbox map instance
   * @returns {Array<string>} An array of visible layer IDs
   */
  getVisibleLayerIds(map) {
    return map
      .getStyle()
      .layers.filter(
        (layer) => map.getLayoutProperty(layer.id, "visibility") !== "none"
      )
      .map((layer) => layer.id);
  }

  /**
   * Gets visible non-basemap layer IDs from the map.
   * @param {Object} map - The Mapbox map instance
   * @returns {Array<string>} An array of visible non-basemap layer IDs
   */
  getVisibleNonBasemapLayerIds(map) {
    const allLayers = map.getStyle().layers;
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
   * @param {Object} map - The Mapbox map instance
   * @public
   */
  printLayerOrder(map) {
    const layers = map.getStyle().layers;
    const layerGroups = {
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
    console.log("Point layers:", layerGroups.point.join(", "));
    console.log("Line layers:", layerGroups.line.join(", "));
    console.log("Polygon layers:", layerGroups.polygon.join(", "));
    console.log("Basemap layers:", layerGroups.basemap.join(", "));
  }

  /**
   * Loads base map layers for a specific style.
   * @param {Object} map - The Mapbox map instance
   * @param {string} styleName - The name of the style to load
   * @returns {Promise<void>}
   */
  async _loadBaseMapLayers(map, styleName) {
    if (!this._addedLayerIds[styleName]) {
      this._addedLayerIds[styleName] = [];
    }
    const mapStyle = await this._fetchStyle(styleName);
    this._addSourcesAndLayers(map, mapStyle, styleName);
  }

  /**
   * Loads base map layers and sets visibility based on the default style.
   * @param {Object} map - The Mapbox map instance
   * @param {string} defaultStyle - The name of the default style
   * @returns {Promise<void>}
   * @private
   */
  async _loadBaseMapLayersVisible(map, defaultStyle) {
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
   * @param {Object} map - The Mapbox map instance
   * @param {string} activeStyle - The name of the active style
   * @private
   */
  _toggleBaseMapVisibility(map, activeStyle) {
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
   * @returns {Object} The blank style object
   * @private
   */
  _createBlankStyle() {
    const defaultBlankStyle = {
      version: 8,
      name: "BlankMap",
      sources: {},
      layers: [],
      glyphs: this._glyphsUrl,
      sprite: this._spriteUrl,
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
   * @returns {Promise<Object>} A promise that resolves to the merged style object
   * @private
   */
  async _fetchStyle(styleName) {
    try {
      const urls = Array.isArray(this._styles[styleName])
        ? this._styles[styleName]
        : [this._styles[styleName]];
      const styleData = await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
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
   * @param {Array<Object>} styleData - An array of style objects to merge
   * @returns {Object} The merged style object
   * @private
   */
  _mergeStyles(styleData) {
    let mergedStyle = { ...styleData[0] };
    for (let i = 1; i < styleData.length; i++) {
      mergedStyle.layers = [...mergedStyle.layers, ...styleData[i].layers];
      mergedStyle.sources = { ...mergedStyle.sources, ...styleData[i].sources };
    }
    return mergedStyle;
  }

  /**
   * Adds sources and layers from a style to the map.
   * @param {Object} map - The Mapbox map instance
   * @param {Object} mapStyle - The style object containing sources and layers
   * @param {string} styleName - The name of the style being added
   * @private
   */
  _addSourcesAndLayers(map, mapStyle, styleName) {
    this._addSources(map, mapStyle.sources);
    this._addLayers(map, mapStyle.layers, styleName);
  }

  /**
   * Adds sources to the map if they don't already exist.
   * @param {Object} map - The Mapbox map instance
   * @param {Object} sources - The sources to add
   * @private
   */
  _addSources(map, sources) {
    Object.entries(sources).forEach(([sourceName, sourceData]) => {
      if (!map.getSource(sourceName)) {
        map.addSource(sourceName, sourceData);
      }
    });
  }

  /**
   * Adds layers to the map with a specific style name prefix.
   * @param {Object} map - The Mapbox map instance
   * @param {Array} layers - The layers to add
   * @param {string} styleName - The style name to prefix layer IDs with
   * @private
   */
  _addLayers(map, layers, styleName) {
    layers.forEach((layer) => {
      let newLayerId = `${styleName}-${layer.id}`;

      if (!map.getLayer(newLayerId)) {
        try {
          const layerToAdd = { ...layer, id: newLayerId };
          this._originalAddLayer(layerToAdd, "base-map");
          this._addedLayerIds[styleName].push(newLayerId);
        } catch (error) {
          console.warn(`Failed to add layer ${newLayerId}:`, error);
        }
      }
    });
  }

  /**
   * Adds identification blank layers to the map.
   * @param {Object} map - The Mapbox map instance
   * @private
   */
  _addIdentificationBlankLayer(map) {
    this._addBlankBackgroundLayer(map, "base-map");
    this._addBlankBackgroundLayer(map, "polygon-layer");
    this._addBlankBackgroundLayer(map, "line-layer");
    this._addBlankBackgroundLayer(map, "point-layer");
  }

  /**
   * Adds a blank background layer to the map.
   * @param {Object} map - The Mapbox map instance
   * @param {string} layerId - The ID for the blank layer
   * @private
   */
  _addBlankBackgroundLayer(map, layerId) {
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "background",
        paint: {
          "background-color": "rgba(255, 255, 255, 0)",
        },
      });
    }
  }

  /**
   * Creates an interceptor for the addLayer method.
   * @returns {Function} The interceptor function
   * @private
   */
  _interceptAddLayer() {
    return (layer, beneathId) => {
      const insertBeneathId = this._getInsertBeneathId(layer, beneathId);
      this._originalAddLayer(layer, insertBeneathId);
    };
  }

  /**
   * Gets the ID of the layer beneath which a new layer should be inserted.
   * @param {Object} layer - The layer to be inserted
   * @param {string|undefined} beneathId - The ID of the layer to insert beneath, if specified
   * @returns {string|undefined} The ID of the layer beneath which to insert the new layer
   * @private
   */
  _getInsertBeneathId(layer, beneathId) {
    if (beneathId === "null") return undefined;
    if (beneathId) return beneathId;

    const layerType = layer.type;
    return this._layerInsertionOrder[layerType] || "polygon-layer";
  }

  /**
   * Checks if the layer is a point layer.
   * @param {Object} layer - The layer to check
   * @returns {boolean} True if the layer is a point layer, false otherwise
   * @private
   */
  _isPointLayer(layer) {
    return this._layerInsertionOrder[layer.type] === "point-layer";
  }

  /**
   * Checks if the layer is a line layer.
   * @param {Object} layer - The layer to check
   * @returns {boolean} True if the layer is a line layer, false otherwise
   * @private
   */
  _isLineLayer(layer) {
    return this._layerInsertionOrder[layer.type] === "line-layer";
  }

  /**
   * Checks if the layer is a polygon layer.
   * @param {Object} layer - The layer to check
   * @returns {boolean} True if the layer is a polygon layer, false otherwise
   * @private
   */
  _isPolygonLayer(layer) {
    return this._layerInsertionOrder[layer.type] === "polygon-layer";
  }
}

export default MapboxLayerManager;
