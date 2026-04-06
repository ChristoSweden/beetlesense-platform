CREATE TABLE IF NOT EXISTS public.weather_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('davis_vantage', 'netatmo', 'ecowitt', 'tempest', 'custom', 'manual')),
  device_id text,
  api_key text,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  latitude numeric,
  longitude numeric,
  altitude_m numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'offline', 'error')),
  last_reading_at timestamptz,
  last_reading jsonb,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weather_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.weather_stations(id) ON DELETE CASCADE,
  temperature_c numeric,
  humidity_pct numeric,
  wind_speed_ms numeric,
  wind_direction_deg numeric,
  precipitation_mm numeric,
  pressure_hpa numeric,
  solar_radiation_wm2 numeric,
  soil_temperature_c numeric,
  soil_moisture_pct numeric,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stations_user ON public.weather_stations(user_id);
CREATE INDEX idx_readings_station ON public.weather_readings(station_id, recorded_at DESC);

ALTER TABLE public.weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stations" ON public.weather_stations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own readings" ON public.weather_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.weather_stations s WHERE s.id = station_id AND s.user_id = auth.uid())
);
