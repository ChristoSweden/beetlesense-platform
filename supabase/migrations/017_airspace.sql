-- Swedish Drone Airspace Compliance
-- Cached airspace zones and flight authorization tracking

-- ─── Airspace Zones (cached from LFV, Drönarkollen, Naturvårdsverket) ───
CREATE TABLE IF NOT EXISTS airspace_zones (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Zone identification
  external_id     TEXT,           -- ID from source system (LFV, droneinfo, etc.)
  source          TEXT NOT NULL CHECK (source IN ('lfv', 'droneinfo', 'notam', 'naturvardsverket', 'manual')),
  zone_type       TEXT NOT NULL CHECK (zone_type IN ('CTR', 'ATZ', 'R', 'P', 'D', 'NATURE_RESERVE', 'NOTAM', 'TRA', 'TSA')),
  -- Details
  name            TEXT NOT NULL,
  name_en         TEXT,
  description     TEXT,
  -- Altitude limits (meters AGL)
  lower_altitude_m  REAL DEFAULT 0,
  max_altitude_m    REAL,          -- NULL = no flight allowed at any altitude
  -- Geometry (WGS84)
  geom            GEOMETRY(Polygon, 4326) NOT NULL,
  center_point    GEOMETRY(Point, 4326),
  radius_m        REAL,            -- For circular zones
  -- Validity
  active          BOOLEAN DEFAULT true,
  active_from     TIMESTAMPTZ,
  active_until    TIMESTAMPTZ,
  -- Permit info
  requires_permit BOOLEAN DEFAULT false,
  permit_authority TEXT,           -- e.g. 'LFV', 'Transportstyrelsen', 'Länsstyrelsen'
  -- Cache metadata
  fetched_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  raw_data        JSONB,           -- Original API response for debugging
  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_airspace_zones_geom ON airspace_zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_airspace_zones_center ON airspace_zones USING GIST (center_point);

-- Lookup indices
CREATE INDEX IF NOT EXISTS idx_airspace_zones_type ON airspace_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_airspace_zones_source ON airspace_zones(source);
CREATE INDEX IF NOT EXISTS idx_airspace_zones_active ON airspace_zones(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_airspace_zones_validity ON airspace_zones(active_from, active_until);
CREATE UNIQUE INDEX IF NOT EXISTS idx_airspace_zones_external ON airspace_zones(source, external_id) WHERE external_id IS NOT NULL;

-- Auto-compute center point from geometry
CREATE OR REPLACE FUNCTION airspace_zones_center_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.center_point := ST_Centroid(NEW.geom);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_airspace_zones_center
  BEFORE INSERT OR UPDATE OF geom ON airspace_zones
  FOR EACH ROW
  EXECUTE FUNCTION airspace_zones_center_trigger();

-- ─── Flight Authorizations ───
-- Tracks pilot/operator permits for restricted airspace
CREATE TABLE IF NOT EXISTS flight_authorizations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Who
  pilot_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  -- Operator registration
  operator_id     TEXT,            -- Transportstyrelsen UAS operator number (e.g. 'SWE...')
  -- EASA category
  drone_category  TEXT NOT NULL CHECK (drone_category IN ('Open', 'Specific', 'Certified')),
  subcategory     TEXT CHECK (subcategory IN ('A1', 'A2', 'A3')),
  -- Certifications held
  cert_a1a3       BOOLEAN DEFAULT false,
  cert_a2         BOOLEAN DEFAULT false,
  cert_sts01      BOOLEAN DEFAULT false,
  cert_sts02      BOOLEAN DEFAULT false,
  cert_luc        BOOLEAN DEFAULT false,
  -- Insurance
  has_insurance   BOOLEAN DEFAULT false,
  insurance_policy TEXT,
  insurance_valid_until TIMESTAMPTZ,
  -- Authorization scope
  authorized_zones UUID[],          -- Specific airspace_zones IDs pilot is authorized for
  authorized_zone_types TEXT[],     -- General zone types pilot can fly in
  max_altitude_m  REAL DEFAULT 120,
  bvlos_authorized BOOLEAN DEFAULT false,
  -- Validity
  valid_from      TIMESTAMPTZ DEFAULT now(),
  valid_until     TIMESTAMPTZ,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  -- Supporting documents (stored in Supabase Storage)
  certificate_urls TEXT[],
  -- Metadata
  notes           TEXT,
  issued_by       TEXT,            -- Authority that issued the authorization
  reference_number TEXT,           -- Authorization reference number
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_auth_pilot ON flight_authorizations(pilot_id);
CREATE INDEX IF NOT EXISTS idx_flight_auth_org ON flight_authorizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_flight_auth_status ON flight_authorizations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_flight_auth_operator ON flight_authorizations(operator_id);

-- Auto-expire authorizations
CREATE OR REPLACE FUNCTION expire_flight_authorizations()
RETURNS void AS $$
BEGIN
  UPDATE flight_authorizations
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND valid_until IS NOT NULL
    AND valid_until < now();
END;
$$ LANGUAGE plpgsql;

-- ─── RLS Policies ───

ALTER TABLE airspace_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_authorizations ENABLE ROW LEVEL SECURITY;

-- Airspace zones: readable by all authenticated users
CREATE POLICY airspace_zones_select ON airspace_zones
  FOR SELECT TO authenticated
  USING (true);

-- Airspace zones: only service role can insert/update (cache refresh)
CREATE POLICY airspace_zones_service_insert ON airspace_zones
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY airspace_zones_service_update ON airspace_zones
  FOR UPDATE TO service_role
  USING (true);

-- Flight authorizations: pilots can view their own
CREATE POLICY flight_auth_select_own ON flight_authorizations
  FOR SELECT TO authenticated
  USING (pilot_id = auth.uid());

-- Flight authorizations: org admins can view org members' authorizations
CREATE POLICY flight_auth_select_org ON flight_authorizations
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE profile_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Flight authorizations: pilots can insert their own
CREATE POLICY flight_auth_insert_own ON flight_authorizations
  FOR INSERT TO authenticated
  WITH CHECK (pilot_id = auth.uid());

-- Flight authorizations: pilots can update their own
CREATE POLICY flight_auth_update_own ON flight_authorizations
  FOR UPDATE TO authenticated
  USING (pilot_id = auth.uid());

-- ─── Utility Functions ───

-- Find airspace zones near a point
CREATE OR REPLACE FUNCTION get_nearby_airspace_zones(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_m DOUBLE PRECISION DEFAULT 15000
)
RETURNS SETOF airspace_zones AS $$
BEGIN
  RETURN QUERY
  SELECT az.*
  FROM airspace_zones az
  WHERE az.active = true
    AND (az.active_until IS NULL OR az.active_until > now())
    AND (az.active_from IS NULL OR az.active_from <= now())
    AND ST_DWithin(
      az.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  ORDER BY ST_Distance(
    az.center_point::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if a point is inside any restricted zone
CREATE OR REPLACE FUNCTION check_airspace_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_altitude_m DOUBLE PRECISION DEFAULT 120
)
RETURNS TABLE (
  zone_id UUID,
  zone_type TEXT,
  zone_name TEXT,
  max_altitude_m REAL,
  requires_permit BOOLEAN,
  permit_authority TEXT,
  is_blocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    az.id,
    az.zone_type,
    az.name,
    az.max_altitude_m,
    az.requires_permit,
    az.permit_authority,
    (az.max_altitude_m IS NULL OR az.max_altitude_m = 0 OR p_altitude_m > az.max_altitude_m) AS is_blocked
  FROM airspace_zones az
  WHERE az.active = true
    AND (az.active_until IS NULL OR az.active_until > now())
    AND (az.active_from IS NULL OR az.active_from <= now())
    AND ST_Contains(az.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326));
END;
$$ LANGUAGE plpgsql STABLE;
