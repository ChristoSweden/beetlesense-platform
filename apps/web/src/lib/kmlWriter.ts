/**
 * KML writer for BeetleSense.ai
 *
 * Generates KML files compatible with Google Earth, with styled placemarks
 * and BeetleSense color theming. Supports points and polygons with
 * extended data for parcel metadata.
 */

// ─── Types ───

export interface KmlPlacemark {
  id: string;
  name: string;
  description?: string;
  /** Point coordinate: [lng, lat] */
  point?: [number, number];
  /** Polygon coordinate rings: array of [lng, lat][] */
  polygonRings?: [number, number][][];
  /** Extended data key-value pairs */
  extendedData?: Record<string, string | number>;
  /** Status determines the style */
  styleId?: string;
}

export interface KmlFolder {
  name: string;
  placemarks: KmlPlacemark[];
}

export interface KmlOptions {
  documentName: string;
  description?: string;
  folders: KmlFolder[];
}

// ─── BeetleSense color styles ───

const STYLES: Record<string, { lineColor: string; fillColor: string; iconHref: string }> = {
  healthy: {
    lineColor: 'ff00c853', // ABGR: green
    fillColor: '6600c853',
    iconHref: 'http://maps.google.com/mapfiles/kml/paddle/grn-circle.png',
  },
  at_risk: {
    lineColor: 'ff00bfff', // ABGR: amber/orange
    fillColor: '6600bfff',
    iconHref: 'http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png',
  },
  infested: {
    lineColor: 'ff0000ef', // ABGR: red
    fillColor: '660000ef',
    iconHref: 'http://maps.google.com/mapfiles/kml/paddle/red-circle.png',
  },
  unknown: {
    lineColor: 'ff999999', // ABGR: gray
    fillColor: '66999999',
    iconHref: 'http://maps.google.com/mapfiles/kml/paddle/wht-circle.png',
  },
  default: {
    lineColor: 'ff4caf50', // ABGR: BeetleSense green
    fillColor: '664caf50',
    iconHref: 'http://maps.google.com/mapfiles/kml/paddle/grn-circle.png',
  },
};

// ─── XML helpers ───

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function coordsToString(coords: [number, number][]): string {
  return coords.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
}

// ─── KML generation ───

function renderStyles(): string {
  let xml = '';
  for (const [id, style] of Object.entries(STYLES)) {
    xml += `
    <Style id="style-${id}">
      <IconStyle>
        <Icon><href>${style.iconHref}</href></Icon>
        <scale>1.0</scale>
      </IconStyle>
      <LineStyle>
        <color>${style.lineColor}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${style.fillColor}</color>
        <outline>1</outline>
      </PolyStyle>
    </Style>`;
  }
  return xml;
}

function renderExtendedData(data: Record<string, string | number>): string {
  let xml = '\n        <ExtendedData>';
  for (const [key, value] of Object.entries(data)) {
    xml += `\n          <Data name="${escapeXml(key)}"><value>${escapeXml(String(value))}</value></Data>`;
  }
  xml += '\n        </ExtendedData>';
  return xml;
}

function renderPlacemark(pm: KmlPlacemark): string {
  const styleRef = pm.styleId && STYLES[pm.styleId] ? pm.styleId : 'default';
  let geometryXml = '';

  if (pm.polygonRings && pm.polygonRings.length > 0) {
    geometryXml = `
        <Polygon>
          <extrude>0</extrude>
          <altitudeMode>clampToGround</altitudeMode>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToString(pm.polygonRings[0])}</coordinates>
            </LinearRing>
          </outerBoundaryIs>${pm.polygonRings
      .slice(1)
      .map(
        (ring) => `
          <innerBoundaryIs>
            <LinearRing>
              <coordinates>${coordsToString(ring)}</coordinates>
            </LinearRing>
          </innerBoundaryIs>`,
      )
      .join('')}
        </Polygon>`;
  } else if (pm.point) {
    geometryXml = `
        <Point>
          <coordinates>${pm.point[0]},${pm.point[1]},0</coordinates>
        </Point>`;
  }

  return `
      <Placemark id="${escapeXml(pm.id)}">
        <name>${escapeXml(pm.name)}</name>${pm.description ? `\n        <description>${escapeXml(pm.description)}</description>` : ''}
        <styleUrl>#style-${styleRef}</styleUrl>${pm.extendedData ? renderExtendedData(pm.extendedData) : ''}${geometryXml}
      </Placemark>`;
}

function renderFolder(folder: KmlFolder): string {
  return `
    <Folder>
      <name>${escapeXml(folder.name)}</name>${folder.placemarks.map(renderPlacemark).join('')}
    </Folder>`;
}

/**
 * Generate a complete KML document string.
 */
export function buildKml(options: KmlOptions): string {
  const { documentName, description, folders } = options;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(documentName)}</name>${description ? `\n    <description>${escapeXml(description)}</description>` : ''}${renderStyles()}${folders.map(renderFolder).join('')}
  </Document>
</kml>`;
}

/**
 * Build a KML string and return as a downloadable Blob.
 */
export function buildKmlBlob(options: KmlOptions): Blob {
  const kmlString = buildKml(options);
  return new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
}
