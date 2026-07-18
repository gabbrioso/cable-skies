import type { StyleSpecification } from "maplibre-gl";

/**
 * Black void + hairline roads only (OpenMapTiles via OpenFreeMap).
 * No fills, labels, or landcover — matches the dither / spine aesthetic.
 */
export const LINE_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "cable-skies-lines",
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "rgba(0,0,0,0)" },
    },
    {
      id: "water-outline",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": "rgba(255,255,255,0.28)",
        "line-width": 0.7,
      },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: {
        "line-color": "rgba(255,255,255,0.32)",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          0.4,
          14,
          1.2,
        ],
      },
    },
    {
      id: "boundary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 4],
      paint: {
        "line-color": "rgba(255,255,255,0.28)",
        "line-width": 0.55,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "road-path",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 12,
      filter: ["in", ["get", "class"], ["literal", ["path", "track", "footway", "cycleway"]]],
      paint: {
        "line-color": "rgba(255,255,255,0.4)",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          0.3,
          16,
          0.8,
        ],
      },
    },
    {
      id: "road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: 11,
      filter: [
        "in",
        ["get", "class"],
        ["literal", ["minor", "service", "tertiary", "street", "street_limited"]],
      ],
      paint: {
        "line-color": "rgba(255,255,255,0.62)",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11,
          0.4,
          16,
          1.6,
        ],
      },
    },
    {
      id: "road-major",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "in",
        ["get", "class"],
        ["literal", ["primary", "secondary", "trunk", "motorway"]],
      ],
      paint: {
        "line-color": "rgba(255,255,255,0.88)",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          0.6,
          12,
          1.4,
          16,
          2.8,
        ],
      },
    },
    {
      id: "road-rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", ["get", "class"], "rail"],
      paint: {
        "line-color": "rgba(255,255,255,0.48)",
        "line-width": 0.7,
        "line-dasharray": [1.5, 1.5],
      },
    },
  ],
};
