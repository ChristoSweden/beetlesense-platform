-- DJI Drone Ecosystem Integration
-- Supports DJI Cloud API, FlightHub 2, waypoint missions, and media management

-- ─── Aircraft Registry ───
CREATE TABLE IF NOT EXISTS dji_aircraft (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pilot_id        UUID REFERENCES profiles(id),
  -- DJI identifiers
  serial_number   TEXT NOT NULL UNIQUE,
  device_sn       TEXT, -- DJI device serial (from Cloud API pairing)
  model           TEXT NOT NULL, -- e.g. 'matrice_350_rtk', 'mavic_3_enterprise', 'mavic_3_multispectral'
  model_name      TEXT NOT NULL, -- Display name: 'DJI Matrice 350 RTK'
  -- Capabilities
  rtk_capable     BOOLEAN DEFAULT false,
  thermal_capable BOOLEAN DEFAULT false,
  multispectral_capable BOOLEAN DEFAULT false,
  lidar_capable   BOOLEAN DEFAULT false,
  max_flight_time_min INTEGER,
  max_altitude_m  INTEGER DEFAULT 120,
  -- Payloads
  payloads        JSONB DEFAULT '[]'::jsonb, -- [{name, type, serial}]
  -- DJI Cloud API pairing
  cloud_paired    BOOLEAN DEFAULT false,
  cloud_workspace_id TEXT, -- DJI FlightHub workspace
  cloud_device_token TEXT, -- Encrypted device token
  -- Status
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  firmware_version TEXT,
  last_seen_at    TIMESTAMPTZ,
  total_flight_hours REAL DEFAULT 0,
  total_flights   INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dji_aircraft_org ON dji_aircraft(organization_id);
CREATE INDEX IF NOT EXISTS idx_dji_aircraft_pilot ON dji_aircraft(pilot_id);

-- ─── Waypoint Missions ───
CREATE TABLE IF NOT EXISTS dji_missions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id       UUID REFERENCES surveys(id) ON DELETE SET NULL,
  parcel_id       UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  aircraft_id     UUID REFERENCES dji_aircraft(id),
  pilot_id        UUID REFERENCES profiles(id),
  -- Mission definition
  name            TEXT NOT NULL,
  mission_type    TEXT NOT NULL DEFAULT 'mapping' CHECK (mission_type IN ('mapping', 'inspection', 'corridor', 'oblique', 'custom')),
  -- Flight parameters
  altitude_m      REAL NOT NULL DEFAULT 80,
  speed_ms        REAL NOT NULL DEFAULT 5,
  overlap_front   REAL NOT NULL DEFAULT 80, -- percentage
  overlap_side    REAL NOT NULL DEFAULT 70,
  gimbal_pitch    REAL NOT NULL DEFAULT -90, -- degrees, -90 = nadir
  camera_interval REAL, -- seconds between shots, null = distance-based
  -- Waypoint data (DJI Cloud API format)
  waypoints       JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{lat, lng, alt, speed, actions}]
  takeoff_point   GEOMETRY(Point, 4326),
  flight_area     GEOMETRY(Polygon, 4326), -- Coverage polygon
  -- Sensor configuration
  sensors_enabled TEXT[] DEFAULT '{rgb}', -- which sensors to capture: rgb, multispectral, thermal, lidar
  -- Status
  status          TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'uploaded', 'in_progress', 'paused', 'completed', 'failed', 'cancelled')),
  -- Computed
  estimated_duration_min REAL,
  estimated_photos INTEGER,
  coverage_area_ha REAL,
  flight_distance_m REAL,
  -- Execution
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  actual_duration_min REAL,
  actual_photos   INTEGER,
  -- Results
  flight_log_path TEXT, -- S3 path to DJI flight log
  media_count     INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dji_missions_survey ON dji_missions(survey_id);
CREATE INDEX IF NOT EXISTS idx_dji_missions_parcel ON dji_missions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_dji_missions_status ON dji_missions(status);
CREATE INDEX IF NOT EXISTS idx_dji_missions_area ON dji_missions USING GIST(flight_area);

-- ─── Real-time Telemetry Snapshots ───
CREATE TABLE IF NOT EXISTS dji_telemetry (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id      UUID NOT NULL REFERENCES dji_missions(id) ON DELETE CASCADE,
  aircraft_id     UUID NOT NULL REFERENCES dji_aircraft(id) ON DELETE CASCADE,
  -- Position
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  altitude_msl    REAL, -- meters above sea level
  altitude_agl    REAL, -- meters above ground level (from terrain model)
  -- Attitude
  heading         REAL, -- degrees 0-360
  pitch           REAL,
  roll            REAL,
  -- Performance
  speed_ms        REAL,
  battery_pct     REAL,
  battery_voltage REAL,
  battery_temp_c  REAL,
  -- Signal
  rc_signal_pct   REAL,
  gps_satellites  INTEGER,
  rtk_fix_type    TEXT, -- 'none', 'float', 'fixed'
  rtk_accuracy_cm REAL,
  -- Gimbal
  gimbal_pitch    REAL,
  gimbal_roll     REAL,
  gimbal_yaw      REAL,
  -- Wind estimate
  wind_speed_ms   REAL,
  wind_direction  REAL,
  -- Storage
  sd_free_mb      REAL,
  photos_taken    INTEGER,
  -- Timestamp
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dji_telemetry_mission ON dji_telemetry(mission_id);
CREATE INDEX IF NOT EXISTS idx_dji_telemetry_time ON dji_telemetry(recorded_at DESC);

-- Hypertable-style partitioning hint (for TimescaleDB if available)
-- SELECT create_hypertable('dji_telemetry', 'recorded_at', if_not_exists => TRUE);

-- ─── Media Files from DJI ───
CREATE TABLE IF NOT EXISTS dji_media (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id      UUID NOT NULL REFERENCES dji_missions(id) ON DELETE CASCADE,
  aircraft_id     UUID REFERENCES dji_aircraft(id),
  -- File info
  filename        TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('photo', 'video', 'panorama', 'hyperlapse', 'timelapse')),
  sensor_type     TEXT NOT NULL CHECK (sensor_type IN ('rgb', 'multispectral', 'thermal', 'lidar', 'ir')),
  mime_type       TEXT,
  file_size_bytes BIGINT,
  storage_path    TEXT, -- S3 path after sync
  thumbnail_path  TEXT,
  -- Geospatial
  location        GEOMETRY(Point, 4326),
  altitude_m      REAL,
  -- Camera metadata
  camera_model    TEXT,
  focal_length_mm REAL,
  iso             INTEGER,
  shutter_speed   TEXT,
  aperture        REAL,
  white_balance   TEXT,
  -- Multispectral bands (if applicable)
  band_names      TEXT[], -- e.g. {'blue', 'green', 'red', 'red_edge', 'nir'}
  -- Status
  sync_status     TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'downloading', 'downloaded', 'processed', 'failed')),
  synced_at       TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dji_media_mission ON dji_media(mission_id);
CREATE INDEX IF NOT EXISTS idx_dji_media_sensor ON dji_media(sensor_type);
CREATE INDEX IF NOT EXISTS idx_dji_media_location ON dji_media USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_dji_media_sync ON dji_media(sync_status) WHERE sync_status != 'processed';

-- ─── RLS ───
ALTER TABLE dji_aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE dji_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dji_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE dji_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their org aircraft" ON dji_aircraft FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users see their org missions" ON dji_missions FOR SELECT
  USING (parcel_id IN (SELECT id FROM parcels WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users see mission telemetry" ON dji_telemetry FOR SELECT
  USING (mission_id IN (SELECT id FROM dji_missions WHERE parcel_id IN (SELECT id FROM parcels WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))));

CREATE POLICY "Users see mission media" ON dji_media FOR SELECT
  USING (mission_id IN (SELECT id FROM dji_missions WHERE parcel_id IN (SELECT id FROM parcels WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))));
