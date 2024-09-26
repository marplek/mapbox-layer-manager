# MapboxLayerManager API Documentation

## Class: MapboxLayerManager

### Constructor

#### `new MapboxLayerManager(options)`

Creates a new MapboxLayerManager instance.

Parameters:

- `options` (Object): Configuration options
  - `mapboxgl` (Object): Mapbox GL JS library
  - `styles` (Object): Style configuration, keys are style names, values are style URLs or URL arrays
  - `mapboxAccessToken` (String): Mapbox access token
  - `glyphs` (String, optional): Font URL
  - `sprite` (String, optional): Sprite image URL
  - `customBlankStyle` (Object, optional): Custom blank style

### Methods

#### `async createMap(options)`

Creates a new map instance.

Parameters:

- `options` (Object):
  - `container` (HTMLElement | String): Map container element or ID
  - `options` (Object): Mapbox GL JS map options
  - `defaultStyle` (String): Default style name

Returns:

- `Promise<MapboxMap>`: Returns a proxied Mapbox map instance

#### `changeBaseMap(newStyle)`

Changes the current base map style.

Parameters:

- `newStyle` (String): Name of the new style

Returns:

- `void`

#### `addSingleLayerToBasemap(styleName, layer)`

Adds a single layer to the specified base map style.

Parameters:

- `styleName` (String): Style name
- `layer` (Object): Layer object to be added

Returns:

- `void`

#### `getAddedLayerIds()`

Gets the IDs of added layers.

Parameters:

Returns:

- `Object`: Layer IDs grouped by style

#### `getStyles()`

Gets the current style configuration.

Parameters:

Returns:

- `Object`: Current style configuration object

#### `getAllLayerIds()`

Gets the IDs of all layers in the map.

Parameters:

Returns:

- `Array<String>`: Array of all layer IDs

#### `getNonBasemapLayerIds()`

Gets the IDs of non-base map layers.

Parameters:

Returns:

- `Array<String>`: Array of non-base map layer IDs

#### `getVisibleLayerIds()`

Gets the IDs of visible layers.

Parameters:

Returns:

- `Array<String>`: Array of visible layer IDs

#### `getVisibleNonBasemapLayerIds()`

Gets the IDs of visible non-base map layers.

Parameters:

Returns:

- `Array<String>`: Array of visible non-base map layer IDs

#### `printLayerOrder()`

Prints the order of layers in the map, grouped by layer type.

Parameters:

Returns:

- `void`

Note: This method outputs layer order information to the console, mainly for debugging purposes.
