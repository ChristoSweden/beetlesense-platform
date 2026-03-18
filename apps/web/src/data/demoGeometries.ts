/**
 * Realistic GeoJSON polygon geometries for 8 demo parcels in Kronoberg/Smaland.
 * Coordinates are WGS84 (EPSG:4326) for MapLibre display.
 *
 * Parcels p1-p5 correspond to DEMO_PARCELS in lib/demoData.ts.
 * Parcels p6-p8 are additional parcels for richer demo scenarios.
 *
 * Polygon shapes follow natural boundaries (forest roads, streams, ridge lines)
 * rather than simple rectangles.
 */

// ─── Types ───

export interface ParcelGeometry {
  parcelId: string;
  name: string;
  municipality: string;
  /** WGS84 polygon coordinates — GeoJSON [lng, lat] convention */
  polygon: number[][][];
  /** Centroid [lng, lat] */
  center: [number, number];
  /** [minLng, minLat, maxLng, maxLat] for zoom-to-fit */
  bbox: [number, number, number, number];
  /** Area in hectares — must match DemoParcel.area_hectares */
  areaHectares: number;
  /** Sub-stand divisions within this parcel */
  subStands: SubStand[];
}

export interface SubStand {
  id: string;
  /** e.g. "Avd. 1" */
  label: string;
  polygon: number[][][];
  areaHectares: number;
  dominantSpecies: string;
  ageClass: number; // stand age in years
  siteIndex: number; // Swedish SI (H100)
}

// ─── Parcel Geometries ───

/**
 * p1: Norra Skogen — 42.5 ha mixed spruce/pine near Varnamo
 * Irregular polygon following a forest road on the west and a stream on the east.
 */
const p1NorraSkogen: ParcelGeometry = {
  parcelId: 'p1',
  name: 'Norra Skogen',
  municipality: 'Värnamo',
  polygon: [[
    [14.024, 57.198], [14.029, 57.201], [14.035, 57.203],
    [14.042, 57.202], [14.049, 57.199], [14.054, 57.195],
    [14.056, 57.190], [14.055, 57.185], [14.051, 57.181],
    [14.045, 57.179], [14.038, 57.178], [14.031, 57.180],
    [14.026, 57.183], [14.022, 57.188], [14.021, 57.193],
    [14.024, 57.198],
  ]],
  center: [14.040, 57.190],
  bbox: [14.021, 57.178, 14.056, 57.203],
  areaHectares: 42.5,
  subStands: [
    {
      id: 'p1-s1', label: 'Avd. 1',
      polygon: [[[14.024, 57.198], [14.029, 57.201], [14.035, 57.203], [14.042, 57.202], [14.040, 57.195], [14.032, 57.194], [14.024, 57.198]]],
      areaHectares: 8.2, dominantSpecies: 'Spruce', ageClass: 65, siteIndex: 28,
    },
    {
      id: 'p1-s2', label: 'Avd. 2',
      polygon: [[[14.032, 57.194], [14.040, 57.195], [14.049, 57.199], [14.054, 57.195], [14.048, 57.190], [14.038, 57.190], [14.032, 57.194]]],
      areaHectares: 10.1, dominantSpecies: 'Spruce', ageClass: 55, siteIndex: 26,
    },
    {
      id: 'p1-s3', label: 'Avd. 3',
      polygon: [[[14.038, 57.190], [14.048, 57.190], [14.056, 57.190], [14.055, 57.185], [14.051, 57.181], [14.045, 57.183], [14.038, 57.190]]],
      areaHectares: 9.8, dominantSpecies: 'Pine', ageClass: 70, siteIndex: 24,
    },
    {
      id: 'p1-s4', label: 'Avd. 4',
      polygon: [[[14.045, 57.183], [14.051, 57.181], [14.045, 57.179], [14.038, 57.178], [14.031, 57.180], [14.038, 57.184], [14.045, 57.183]]],
      areaHectares: 7.6, dominantSpecies: 'Spruce', ageClass: 45, siteIndex: 30,
    },
    {
      id: 'p1-s5', label: 'Avd. 5',
      polygon: [[[14.024, 57.198], [14.032, 57.194], [14.038, 57.190], [14.038, 57.184], [14.031, 57.180], [14.026, 57.183], [14.022, 57.188], [14.021, 57.193], [14.024, 57.198]]],
      areaHectares: 6.8, dominantSpecies: 'Birch', ageClass: 35, siteIndex: 22,
    },
  ],
};

/**
 * p2: Ekbacken — 18.3 ha oak/birch near Gislaved
 * Compact polygon on a south-facing slope.
 */
const p2Ekbacken: ParcelGeometry = {
  parcelId: 'p2',
  name: 'Ekbacken',
  municipality: 'Gislaved',
  polygon: [[
    [13.520, 57.306], [13.527, 57.308], [13.535, 57.309],
    [13.541, 57.307], [13.544, 57.303], [13.543, 57.299],
    [13.538, 57.296], [13.530, 57.295], [13.523, 57.297],
    [13.519, 57.301], [13.520, 57.306],
  ]],
  center: [13.530, 57.302],
  bbox: [13.519, 57.295, 13.544, 57.309],
  areaHectares: 18.3,
  subStands: [
    {
      id: 'p2-s1', label: 'Avd. 1',
      polygon: [[[13.520, 57.306], [13.527, 57.308], [13.535, 57.309], [13.541, 57.307], [13.535, 57.302], [13.525, 57.303], [13.520, 57.306]]],
      areaHectares: 7.5, dominantSpecies: 'Oak', ageClass: 95, siteIndex: 20,
    },
    {
      id: 'p2-s2', label: 'Avd. 2',
      polygon: [[[13.525, 57.303], [13.535, 57.302], [13.541, 57.307], [13.544, 57.303], [13.543, 57.299], [13.535, 57.300], [13.525, 57.303]]],
      areaHectares: 5.8, dominantSpecies: 'Birch', ageClass: 40, siteIndex: 24,
    },
    {
      id: 'p2-s3', label: 'Avd. 3',
      polygon: [[[13.525, 57.303], [13.535, 57.300], [13.543, 57.299], [13.538, 57.296], [13.530, 57.295], [13.523, 57.297], [13.519, 57.301], [13.520, 57.306], [13.525, 57.303]]],
      areaHectares: 5.0, dominantSpecies: 'Spruce', ageClass: 50, siteIndex: 26,
    },
  ],
};

/**
 * p3: Tallmon — 67.1 ha pine-dominated near Jonkoping
 * Large parcel on elevated terrain with natural ridge boundary.
 */
const p3Tallmon: ParcelGeometry = {
  parcelId: 'p3',
  name: 'Tallmon',
  municipality: 'Jönköping',
  polygon: [[
    [14.140, 57.790], [14.150, 57.794], [14.162, 57.796],
    [14.175, 57.795], [14.185, 57.791], [14.190, 57.785],
    [14.188, 57.778], [14.183, 57.772], [14.175, 57.768],
    [14.165, 57.766], [14.154, 57.767], [14.145, 57.770],
    [14.138, 57.775], [14.135, 57.782], [14.136, 57.787],
    [14.140, 57.790],
  ]],
  center: [14.162, 57.781],
  bbox: [14.135, 57.766, 14.190, 57.796],
  areaHectares: 67.1,
  subStands: [
    {
      id: 'p3-s1', label: 'Avd. 1',
      polygon: [[[14.140, 57.790], [14.150, 57.794], [14.162, 57.796], [14.162, 57.788], [14.148, 57.786], [14.140, 57.790]]],
      areaHectares: 12.3, dominantSpecies: 'Pine', ageClass: 80, siteIndex: 22,
    },
    {
      id: 'p3-s2', label: 'Avd. 2',
      polygon: [[[14.162, 57.796], [14.175, 57.795], [14.185, 57.791], [14.180, 57.785], [14.168, 57.786], [14.162, 57.788], [14.162, 57.796]]],
      areaHectares: 14.5, dominantSpecies: 'Pine', ageClass: 75, siteIndex: 24,
    },
    {
      id: 'p3-s3', label: 'Avd. 3',
      polygon: [[[14.148, 57.786], [14.162, 57.788], [14.168, 57.786], [14.180, 57.785], [14.190, 57.785], [14.188, 57.778], [14.175, 57.778], [14.155, 57.780], [14.148, 57.786]]],
      areaHectares: 15.8, dominantSpecies: 'Spruce', ageClass: 60, siteIndex: 26,
    },
    {
      id: 'p3-s4', label: 'Avd. 4',
      polygon: [[[14.155, 57.780], [14.175, 57.778], [14.188, 57.778], [14.183, 57.772], [14.175, 57.768], [14.165, 57.770], [14.155, 57.780]]],
      areaHectares: 13.2, dominantSpecies: 'Pine', ageClass: 55, siteIndex: 22,
    },
    {
      id: 'p3-s5', label: 'Avd. 5',
      polygon: [[[14.140, 57.790], [14.148, 57.786], [14.155, 57.780], [14.165, 57.770], [14.154, 57.767], [14.145, 57.770], [14.138, 57.775], [14.135, 57.782], [14.136, 57.787], [14.140, 57.790]]],
      areaHectares: 11.3, dominantSpecies: 'Birch', ageClass: 30, siteIndex: 20,
    },
  ],
};

/**
 * p4: Granudden — 31.9 ha spruce-dominated near Varnamo (infested)
 * The beetle-damaged parcel. Elongated shape along a valley.
 */
const p4Granudden: ParcelGeometry = {
  parcelId: 'p4',
  name: 'Granudden',
  municipality: 'Värnamo',
  polygon: [[
    [14.088, 57.228], [14.096, 57.231], [14.105, 57.232],
    [14.114, 57.230], [14.120, 57.226], [14.122, 57.221],
    [14.119, 57.216], [14.113, 57.212], [14.105, 57.211],
    [14.097, 57.213], [14.091, 57.217], [14.087, 57.222],
    [14.088, 57.228],
  ]],
  center: [14.105, 57.221],
  bbox: [14.087, 57.211, 14.122, 57.232],
  areaHectares: 31.9,
  subStands: [
    {
      id: 'p4-s1', label: 'Avd. 1',
      polygon: [[[14.088, 57.228], [14.096, 57.231], [14.105, 57.232], [14.105, 57.225], [14.095, 57.225], [14.088, 57.228]]],
      areaHectares: 6.4, dominantSpecies: 'Spruce', ageClass: 70, siteIndex: 28,
    },
    {
      id: 'p4-s2', label: 'Avd. 2',
      polygon: [[[14.105, 57.232], [14.114, 57.230], [14.120, 57.226], [14.115, 57.222], [14.105, 57.225], [14.105, 57.232]]],
      areaHectares: 7.2, dominantSpecies: 'Spruce', ageClass: 65, siteIndex: 26,
    },
    {
      id: 'p4-s3', label: 'Avd. 3',
      polygon: [[[14.095, 57.225], [14.105, 57.225], [14.115, 57.222], [14.122, 57.221], [14.119, 57.216], [14.110, 57.218], [14.100, 57.220], [14.095, 57.225]]],
      areaHectares: 8.8, dominantSpecies: 'Spruce', ageClass: 75, siteIndex: 28,
    },
    {
      id: 'p4-s4', label: 'Avd. 4',
      polygon: [[[14.100, 57.220], [14.110, 57.218], [14.119, 57.216], [14.113, 57.212], [14.105, 57.211], [14.097, 57.213], [14.100, 57.220]]],
      areaHectares: 5.8, dominantSpecies: 'Spruce', ageClass: 60, siteIndex: 30,
    },
    {
      id: 'p4-s5', label: 'Avd. 5',
      polygon: [[[14.088, 57.228], [14.095, 57.225], [14.100, 57.220], [14.097, 57.213], [14.091, 57.217], [14.087, 57.222], [14.088, 57.228]]],
      areaHectares: 3.7, dominantSpecies: 'Pine', ageClass: 50, siteIndex: 24,
    },
  ],
};

/**
 * p5: Bjorklund — 55.0 ha birch-dominated near Nassjo
 * Wetland-adjacent parcel with peat soil. No survey yet.
 */
const p5Bjorklund: ParcelGeometry = {
  parcelId: 'p5',
  name: 'Björklund',
  municipality: 'Nässjö',
  polygon: [[
    [14.682, 57.660], [14.692, 57.664], [14.704, 57.666],
    [14.715, 57.664], [14.722, 57.659], [14.724, 57.653],
    [14.720, 57.647], [14.713, 57.642], [14.703, 57.640],
    [14.693, 57.641], [14.685, 57.645], [14.680, 57.651],
    [14.680, 57.656], [14.682, 57.660],
  ]],
  center: [14.702, 57.652],
  bbox: [14.680, 57.640, 14.724, 57.666],
  areaHectares: 55.0,
  subStands: [
    {
      id: 'p5-s1', label: 'Avd. 1',
      polygon: [[[14.682, 57.660], [14.692, 57.664], [14.704, 57.666], [14.702, 57.656], [14.690, 57.655], [14.682, 57.660]]],
      areaHectares: 13.5, dominantSpecies: 'Birch', ageClass: 40, siteIndex: 20,
    },
    {
      id: 'p5-s2', label: 'Avd. 2',
      polygon: [[[14.704, 57.666], [14.715, 57.664], [14.722, 57.659], [14.718, 57.653], [14.708, 57.655], [14.702, 57.656], [14.704, 57.666]]],
      areaHectares: 12.8, dominantSpecies: 'Spruce', ageClass: 45, siteIndex: 24,
    },
    {
      id: 'p5-s3', label: 'Avd. 3',
      polygon: [[[14.690, 57.655], [14.702, 57.656], [14.708, 57.655], [14.718, 57.653], [14.724, 57.653], [14.720, 57.647], [14.710, 57.648], [14.698, 57.650], [14.690, 57.655]]],
      areaHectares: 14.2, dominantSpecies: 'Birch', ageClass: 35, siteIndex: 18,
    },
    {
      id: 'p5-s4', label: 'Avd. 4',
      polygon: [[[14.698, 57.650], [14.710, 57.648], [14.720, 57.647], [14.713, 57.642], [14.703, 57.640], [14.693, 57.641], [14.698, 57.650]]],
      areaHectares: 8.5, dominantSpecies: 'Alder', ageClass: 25, siteIndex: 16,
    },
    {
      id: 'p5-s5', label: 'Avd. 5',
      polygon: [[[14.682, 57.660], [14.690, 57.655], [14.698, 57.650], [14.693, 57.641], [14.685, 57.645], [14.680, 57.651], [14.680, 57.656], [14.682, 57.660]]],
      areaHectares: 6.0, dominantSpecies: 'Birch', ageClass: 50, siteIndex: 20,
    },
  ],
};

/**
 * p6: Mossebacken — 24.7 ha near Alvesta. Recently thinned, showing recovery.
 */
const p6Mossebacken: ParcelGeometry = {
  parcelId: 'p6',
  name: 'Mossebacken',
  municipality: 'Alvesta',
  polygon: [[
    [14.550, 56.905], [14.557, 56.908], [14.566, 56.910],
    [14.574, 56.908], [14.578, 56.904], [14.576, 56.899],
    [14.570, 56.896], [14.562, 56.895], [14.554, 56.897],
    [14.550, 56.901], [14.550, 56.905],
  ]],
  center: [14.563, 56.902],
  bbox: [14.550, 56.895, 14.578, 56.910],
  areaHectares: 24.7,
  subStands: [
    {
      id: 'p6-s1', label: 'Avd. 1',
      polygon: [[[14.550, 56.905], [14.557, 56.908], [14.566, 56.910], [14.566, 56.903], [14.555, 56.903], [14.550, 56.905]]],
      areaHectares: 8.2, dominantSpecies: 'Spruce', ageClass: 45, siteIndex: 28,
    },
    {
      id: 'p6-s2', label: 'Avd. 2',
      polygon: [[[14.566, 56.910], [14.574, 56.908], [14.578, 56.904], [14.572, 56.900], [14.566, 56.903], [14.566, 56.910]]],
      areaHectares: 7.0, dominantSpecies: 'Pine', ageClass: 55, siteIndex: 24,
    },
    {
      id: 'p6-s3', label: 'Avd. 3',
      polygon: [[[14.550, 56.905], [14.555, 56.903], [14.566, 56.903], [14.572, 56.900], [14.578, 56.904], [14.576, 56.899], [14.570, 56.896], [14.562, 56.895], [14.554, 56.897], [14.550, 56.901], [14.550, 56.905]]],
      areaHectares: 9.5, dominantSpecies: 'Spruce', ageClass: 40, siteIndex: 30,
    },
  ],
};

/**
 * p7: Stensjo — 38.2 ha near Ljungby. Mixed conifer on rocky terrain.
 */
const p7Stensjo: ParcelGeometry = {
  parcelId: 'p7',
  name: 'Stensjö',
  municipality: 'Ljungby',
  polygon: [[
    [13.930, 56.840], [13.938, 56.844], [13.948, 56.846],
    [13.958, 56.845], [13.966, 56.841], [13.968, 56.836],
    [13.965, 56.830], [13.958, 56.826], [13.948, 56.824],
    [13.939, 56.826], [13.932, 56.830], [13.929, 56.835],
    [13.930, 56.840],
  ]],
  center: [13.948, 56.835],
  bbox: [13.929, 56.824, 13.968, 56.846],
  areaHectares: 38.2,
  subStands: [
    {
      id: 'p7-s1', label: 'Avd. 1',
      polygon: [[[13.930, 56.840], [13.938, 56.844], [13.948, 56.846], [13.948, 56.838], [13.938, 56.837], [13.930, 56.840]]],
      areaHectares: 10.5, dominantSpecies: 'Pine', ageClass: 85, siteIndex: 22,
    },
    {
      id: 'p7-s2', label: 'Avd. 2',
      polygon: [[[13.948, 56.846], [13.958, 56.845], [13.966, 56.841], [13.960, 56.836], [13.948, 56.838], [13.948, 56.846]]],
      areaHectares: 9.2, dominantSpecies: 'Spruce', ageClass: 60, siteIndex: 26,
    },
    {
      id: 'p7-s3', label: 'Avd. 3',
      polygon: [[[13.938, 56.837], [13.948, 56.838], [13.960, 56.836], [13.966, 56.841], [13.968, 56.836], [13.965, 56.830], [13.955, 56.832], [13.945, 56.833], [13.938, 56.837]]],
      areaHectares: 11.0, dominantSpecies: 'Pine', ageClass: 70, siteIndex: 20,
    },
    {
      id: 'p7-s4', label: 'Avd. 4',
      polygon: [[[13.930, 56.840], [13.938, 56.837], [13.945, 56.833], [13.955, 56.832], [13.965, 56.830], [13.958, 56.826], [13.948, 56.824], [13.939, 56.826], [13.932, 56.830], [13.929, 56.835], [13.930, 56.840]]],
      areaHectares: 7.5, dominantSpecies: 'Birch', ageClass: 35, siteIndex: 18,
    },
  ],
};

/**
 * p8: Askaremala — 12.8 ha near Tingsryd. Small parcel, young plantation.
 */
const p8Askaremala: ParcelGeometry = {
  parcelId: 'p8',
  name: 'Askaremåla',
  municipality: 'Tingsryd',
  polygon: [[
    [15.180, 56.530], [15.186, 56.532], [15.193, 56.533],
    [15.199, 56.531], [15.201, 56.528], [15.199, 56.525],
    [15.194, 56.523], [15.187, 56.522], [15.182, 56.524],
    [15.179, 56.527], [15.180, 56.530],
  ]],
  center: [15.190, 56.527],
  bbox: [15.179, 56.522, 15.201, 56.533],
  areaHectares: 12.8,
  subStands: [
    {
      id: 'p8-s1', label: 'Avd. 1',
      polygon: [[[15.180, 56.530], [15.186, 56.532], [15.193, 56.533], [15.192, 56.528], [15.184, 56.528], [15.180, 56.530]]],
      areaHectares: 5.2, dominantSpecies: 'Spruce', ageClass: 15, siteIndex: 32,
    },
    {
      id: 'p8-s2', label: 'Avd. 2',
      polygon: [[[15.193, 56.533], [15.199, 56.531], [15.201, 56.528], [15.196, 56.525], [15.192, 56.528], [15.193, 56.533]]],
      areaHectares: 4.1, dominantSpecies: 'Spruce', ageClass: 12, siteIndex: 32,
    },
    {
      id: 'p8-s3', label: 'Avd. 3',
      polygon: [[[15.180, 56.530], [15.184, 56.528], [15.192, 56.528], [15.196, 56.525], [15.199, 56.525], [15.194, 56.523], [15.187, 56.522], [15.182, 56.524], [15.179, 56.527], [15.180, 56.530]]],
      areaHectares: 3.5, dominantSpecies: 'Pine', ageClass: 18, siteIndex: 26,
    },
  ],
};

// ─── Exports ───

export const DEMO_GEOMETRIES: ParcelGeometry[] = [
  p1NorraSkogen,
  p2Ekbacken,
  p3Tallmon,
  p4Granudden,
  p5Bjorklund,
  p6Mossebacken,
  p7Stensjo,
  p8Askaremala,
];

/** Lookup geometry by parcel ID */
export function getParcelGeometry(parcelId: string): ParcelGeometry | undefined {
  return DEMO_GEOMETRIES.find((g) => g.parcelId === parcelId);
}

/** Get all sub-stands for a parcel */
export function getSubStands(parcelId: string): SubStand[] {
  return getParcelGeometry(parcelId)?.subStands ?? [];
}

/**
 * Convert all demo geometries to a GeoJSON FeatureCollection
 * for direct use with MapLibre's addSource.
 */
export function toGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: DEMO_GEOMETRIES.map((g) => ({
      type: 'Feature' as const,
      id: g.parcelId,
      properties: {
        id: g.parcelId,
        name: g.name,
        municipality: g.municipality,
        areaHectares: g.areaHectares,
        subStandCount: g.subStands.length,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: g.polygon,
      },
    })),
  };
}

/**
 * Convert sub-stands to a GeoJSON FeatureCollection
 * for rendering stand boundaries.
 */
export function subStandsToGeoJSON(parcelId?: string): GeoJSON.FeatureCollection {
  const geometries = parcelId
    ? DEMO_GEOMETRIES.filter((g) => g.parcelId === parcelId)
    : DEMO_GEOMETRIES;

  const features = geometries.flatMap((g) =>
    g.subStands.map((s) => ({
      type: 'Feature' as const,
      id: s.id,
      properties: {
        id: s.id,
        parcelId: g.parcelId,
        label: s.label,
        areaHectares: s.areaHectares,
        dominantSpecies: s.dominantSpecies,
        ageClass: s.ageClass,
        siteIndex: s.siteIndex,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: s.polygon,
      },
    })),
  );

  return { type: 'FeatureCollection', features };
}
