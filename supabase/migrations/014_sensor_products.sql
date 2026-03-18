-- Sensor products: derived data products from multi-sensor drone processing
-- Each row represents a single raster/file produced by sensor-specific processing

CREATE TABLE IF NOT EXISTS sensor_products (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  parcel_id     UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  sensor_type   TEXT NOT NULL CHECK (sensor_type IN ('multispectral', 'thermal', 'rgb', 'lidar')),
  product_name  TEXT NOT NULL, -- e.g. 'ndvi', 'ndre', 'temperature', 'anomaly', 'orthomosaic', 'chm'
  storage_path  TEXT NOT NULL, -- S3 path to the raster file
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (survey_id, sensor_type, product_name)
);

-- Index for fast lookups by survey and parcel
CREATE INDEX IF NOT EXISTS idx_sensor_products_survey ON sensor_products(survey_id);
CREATE INDEX IF NOT EXISTS idx_sensor_products_parcel ON sensor_products(parcel_id);
CREATE INDEX IF NOT EXISTS idx_sensor_products_type ON sensor_products(sensor_type);

-- RLS
ALTER TABLE sensor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sensor products for their parcels"
  ON sensor_products FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM parcels WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Pixel-level fusion results: per-pixel feature vectors and derived products
CREATE TABLE IF NOT EXISTS fusion_products (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  parcel_id     UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  product_name  TEXT NOT NULL, -- e.g. 'beetle_stress', 'crown_health', 'moisture_stress', 'tree_inventory'
  storage_path  TEXT NOT NULL,
  sensors_used  TEXT[] NOT NULL DEFAULT '{}', -- which sensor types contributed
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (survey_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_fusion_products_survey ON fusion_products(survey_id);
CREATE INDEX IF NOT EXISTS idx_fusion_products_parcel ON fusion_products(parcel_id);

ALTER TABLE fusion_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fusion products for their parcels"
  ON fusion_products FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM parcels WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Per-tree inventory: individual tree records from LiDAR + RGB + multispectral fusion
CREATE TABLE IF NOT EXISTS tree_inventory (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  parcel_id     UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  tree_number   INTEGER NOT NULL,
  -- Position (SWEREF99 TM)
  geom          GEOMETRY(Point, 3006) NOT NULL,
  -- LiDAR-derived
  height_m      REAL,
  crown_diameter_m REAL,
  crown_area_m2 REAL,
  dbh_cm        REAL, -- estimated diameter at breast height
  volume_m3     REAL, -- estimated stem volume
  -- Multispectral-derived
  ndvi          REAL,
  ndre          REAL,
  chlorophyll   REAL, -- from CRI/MCARI
  -- Thermal-derived
  crown_temp_c  REAL,
  temp_anomaly  REAL, -- z-score relative to stand mean
  -- RGB-derived
  species_prediction TEXT,
  species_confidence REAL,
  -- Composite health score (0-100)
  health_score  REAL,
  -- Status
  stress_flag   BOOLEAN DEFAULT false,
  stress_type   TEXT, -- 'beetle', 'drought', 'disease', 'mechanical'
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (survey_id, tree_number)
);

CREATE INDEX IF NOT EXISTS idx_tree_inventory_survey ON tree_inventory(survey_id);
CREATE INDEX IF NOT EXISTS idx_tree_inventory_parcel ON tree_inventory(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tree_inventory_geom ON tree_inventory USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_tree_inventory_stress ON tree_inventory(stress_flag) WHERE stress_flag = true;

ALTER TABLE tree_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tree inventory for their parcels"
  ON tree_inventory FOR SELECT
  USING (
    parcel_id IN (
      SELECT id FROM parcels WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
