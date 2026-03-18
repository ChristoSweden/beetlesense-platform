import { useState, useMemo, useCallback } from 'react';
import {
  Plane,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Shield,
  Thermometer,
  Signal,
  Cpu,
  Info,
} from 'lucide-react';

// ─── Manufacturer & Model Definitions ───

type Manufacturer = 'dji' | 'autel' | 'parrot';

interface DroneModel {
  id: string;
  name: string;
  manufacturer: Manufacturer;
  rtkCapable: boolean;
  thermalCapable: boolean;
  multispectralCapable: boolean;
  lidarCapable: boolean;
  maxFlightTimeMin: number;
  ndaaCompliant: boolean;
  connectivity4G: boolean;
  serialPattern: RegExp;
  serialPlaceholder: string;
  /** Cloud pairing instructions */
  pairingInstructions: string;
}

const MANUFACTURERS: Record<Manufacturer, { name: string; logo: string }> = {
  dji: {
    name: 'DJI',
    logo: '/assets/logos/dji.svg',
  },
  autel: {
    name: 'Autel Robotics',
    logo: '/assets/logos/autel.svg',
  },
  parrot: {
    name: 'Parrot',
    logo: '/assets/logos/parrot.svg',
  },
};

const DRONE_MODELS: DroneModel[] = [
  // ─── DJI ───
  {
    id: 'matrice_350_rtk',
    name: 'DJI Matrice 350 RTK',
    manufacturer: 'dji',
    rtkCapable: true,
    thermalCapable: true,
    multispectralCapable: true,
    lidarCapable: true,
    maxFlightTimeMin: 55,
    ndaaCompliant: false,
    connectivity4G: false,
    serialPattern: /^[A-Z0-9]{14}$/,
    serialPlaceholder: 'T.ex. 1ZNBJ4A00C0001',
    pairingInstructions: 'Logga in i DJI FlightHub 2 och lagg till dronaren via "Add Device". Ange serienumret och koppla via DJI RC Plus-kontrollen.',
  },
  {
    id: 'mavic_3_enterprise',
    name: 'DJI Mavic 3 Enterprise',
    manufacturer: 'dji',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 45,
    ndaaCompliant: false,
    connectivity4G: false,
    serialPattern: /^[A-Z0-9]{14}$/,
    serialPlaceholder: 'T.ex. 1SSDJ5H00C0042',
    pairingInstructions: 'Logga in i DJI FlightHub 2 och lagg till dronaren via "Add Device". Anslut via DJI RC Pro Enterprise.',
  },
  {
    id: 'mavic_3_multispectral',
    name: 'DJI Mavic 3 Multispectral',
    manufacturer: 'dji',
    rtkCapable: true,
    thermalCapable: false,
    multispectralCapable: true,
    lidarCapable: false,
    maxFlightTimeMin: 43,
    ndaaCompliant: false,
    connectivity4G: false,
    serialPattern: /^[A-Z0-9]{14}$/,
    serialPlaceholder: 'T.ex. 1SSDM3M00C0015',
    pairingInstructions: 'Logga in i DJI FlightHub 2. Koppla dronaren via DJI RC Pro Enterprise med multispektralkamera monterad.',
  },
  {
    id: 'matrice_30t',
    name: 'DJI Matrice 30T',
    manufacturer: 'dji',
    rtkCapable: true,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 41,
    ndaaCompliant: false,
    connectivity4G: false,
    serialPattern: /^[A-Z0-9]{14}$/,
    serialPlaceholder: 'T.ex. 1ZNBM3000C0008',
    pairingInstructions: 'Logga in i DJI FlightHub 2 och lagg till dronaren via "Add Device". Anslut via DJI RC Plus.',
  },
  // ─── Autel ───
  {
    id: 'evo_ii_pro_v3',
    name: 'Autel EVO II Pro V3',
    manufacturer: 'autel',
    rtkCapable: true,
    thermalCapable: false,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 42,
    ndaaCompliant: true,
    connectivity4G: false,
    serialPattern: /^AU[A-Z0-9]{10,12}$/,
    serialPlaceholder: 'T.ex. AUEV2P3A00001',
    pairingInstructions: 'Logga in i Autel Cloud och registrera dronaren via "Fleet Management". Koppla via Autel Smart Controller V3.',
  },
  {
    id: 'evo_ii_dual_640t_v3',
    name: 'Autel EVO II Dual 640T V3',
    manufacturer: 'autel',
    rtkCapable: true,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 38,
    ndaaCompliant: true,
    connectivity4G: false,
    serialPattern: /^AU[A-Z0-9]{10,12}$/,
    serialPlaceholder: 'T.ex. AUED64T300001',
    pairingInstructions: 'Logga in i Autel Cloud och registrera dronaren via "Fleet Management". Anvand Autel Smart Controller V3 for koppling.',
  },
  {
    id: 'evo_max_4t',
    name: 'Autel EVO Max 4T',
    manufacturer: 'autel',
    rtkCapable: true,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 42,
    ndaaCompliant: true,
    connectivity4G: false,
    serialPattern: /^AU[A-Z0-9]{10,12}$/,
    serialPlaceholder: 'T.ex. AUEM4T0A00001',
    pairingInstructions: 'Logga in i Autel Cloud och registrera dronaren via "Fleet Management". EVO Max 4T kopplas via Smart Controller V3.',
  },
  // ─── Parrot ───
  {
    id: 'anafi_usa',
    name: 'Parrot ANAFI USA',
    manufacturer: 'parrot',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 32,
    ndaaCompliant: true,
    connectivity4G: false,
    serialPattern: /^PI\d{6}[A-Z]{2}\d{4}$/,
    serialPlaceholder: 'T.ex. PI040052AA0001',
    pairingInstructions: 'Logga in i Parrot Cloud via FreeFlight Enterprise-appen. Para dronaren genom att skanna QR-koden pa dronaren i appen.',
  },
  {
    id: 'anafi_ai',
    name: 'Parrot ANAFI Ai',
    manufacturer: 'parrot',
    rtkCapable: false,
    thermalCapable: false,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 32,
    ndaaCompliant: true,
    connectivity4G: true,
    serialPattern: /^PI\d{6}[A-Z]{2}\d{4}$/,
    serialPlaceholder: 'T.ex. PI050078AB0012',
    pairingInstructions: 'Logga in i Parrot Cloud via FreeFlight Enterprise-appen. ANAFI Ai stodjer 4G — satt in SIM-kort och para via appen.',
  },
  {
    id: 'anafi_thermal',
    name: 'Parrot ANAFI Thermal',
    manufacturer: 'parrot',
    rtkCapable: false,
    thermalCapable: true,
    multispectralCapable: false,
    lidarCapable: false,
    maxFlightTimeMin: 26,
    ndaaCompliant: true,
    connectivity4G: false,
    serialPattern: /^PI\d{6}[A-Z]{2}\d{4}$/,
    serialPlaceholder: 'T.ex. PI030041AC0003',
    pairingInstructions: 'Logga in i Parrot Cloud via FreeFlight Enterprise-appen. Para dronaren genom att skanna QR-koden pa dronaren.',
  },
];

// ─── Component ───

interface DroneRegistrationProps {
  onRegistered?: (drone: {
    manufacturer: Manufacturer;
    model: string;
    serialNumber: string;
    capabilities: {
      rtk: boolean;
      thermal: boolean;
      multispectral: boolean;
      lidar: boolean;
      ndaa: boolean;
      connectivity4G: boolean;
    };
  }) => void;
  onCancel?: () => void;
}

export default function DroneRegistration({ onRegistered, onCancel }: DroneRegistrationProps) {
  const [manufacturer, setManufacturer] = useState<Manufacturer | ''>('');
  const [modelId, setModelId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serialError, setSerialError] = useState('');
  const [showPairing, setShowPairing] = useState(false);

  // Filter models by selected manufacturer
  const filteredModels = useMemo(
    () => manufacturer ? DRONE_MODELS.filter(m => m.manufacturer === manufacturer) : [],
    [manufacturer],
  );

  // Current selected model
  const selectedModel = useMemo(
    () => DRONE_MODELS.find(m => m.id === modelId) ?? null,
    [modelId],
  );

  // Validate serial number against manufacturer-specific pattern
  const validateSerial = useCallback((value: string) => {
    if (!value) {
      setSerialError('');
      return false;
    }
    if (!selectedModel) {
      setSerialError('');
      return false;
    }
    if (!selectedModel.serialPattern.test(value)) {
      setSerialError('Ogiltigt serienummerformat for vald modell');
      return false;
    }
    setSerialError('');
    return true;
  }, [selectedModel]);

  const handleManufacturerChange = (mfr: Manufacturer) => {
    setManufacturer(mfr);
    setModelId('');
    setSerialNumber('');
    setSerialError('');
    setShowPairing(false);
  };

  const handleModelChange = (id: string) => {
    setModelId(id);
    setSerialNumber('');
    setSerialError('');
    setShowPairing(false);
  };

  const handleSerialChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setSerialNumber(upper);
    if (upper.length > 3) {
      validateSerial(upper);
    } else {
      setSerialError('');
    }
  };

  const isValid = manufacturer && modelId && serialNumber && !serialError && validateSerial(serialNumber);

  const handleSubmit = async () => {
    if (!isValid || !selectedModel) return;

    setSubmitting(true);
    try {
      onRegistered?.({
        manufacturer: selectedModel.manufacturer,
        model: selectedModel.id,
        serialNumber,
        capabilities: {
          rtk: selectedModel.rtkCapable,
          thermal: selectedModel.thermalCapable,
          multispectral: selectedModel.multispectralCapable,
          lidar: selectedModel.lidarCapable,
          ndaa: selectedModel.ndaaCompliant,
          connectivity4G: selectedModel.connectivity4G,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6 max-w-lg w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
          <Plane size={20} className="text-[var(--green)]" />
        </div>
        <div>
          <h2 className="text-base font-serif font-bold text-[var(--text)]">Registrera dronare</h2>
          <p className="text-xs text-[var(--text3)]">Lagg till en ny dronare i din flotta</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Manufacturer selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text2)]">Tillverkare</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(MANUFACTURERS) as [Manufacturer, typeof MANUFACTURERS[Manufacturer]][]).map(
              ([key, mfr]) => (
                <button
                  key={key}
                  onClick={() => handleManufacturerChange(key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    manufacturer === key
                      ? 'border-[var(--green)] bg-[var(--green)]/5'
                      : 'border-[var(--border)] bg-[var(--bg3)] hover:border-[var(--border2)]'
                  }`}
                >
                  <img
                    src={mfr.logo}
                    alt={mfr.name}
                    className="h-6 w-auto object-contain opacity-80"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-lg font-bold text-[var(--text)]">{mfr.name.charAt(0)}</span>
                  <span className="text-[10px] font-medium text-[var(--text2)]">{mfr.name}</span>
                </button>
              ),
            )}
          </div>
        </div>

        {/* Model dropdown */}
        {manufacturer && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text2)]">Modell</label>
            <div className="relative">
              <select
                value={modelId}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg3)] px-3 py-2.5 text-sm text-[var(--text)] focus:border-[var(--green)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 pr-8"
              >
                <option value="">Valj modell...</option>
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none"
              />
            </div>
          </div>
        )}

        {/* Capability badges */}
        {selectedModel && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text2)]">Funktioner</label>
            <div className="flex flex-wrap gap-1.5">
              {selectedModel.rtkCapable && (
                <Badge icon={<Signal size={10} />} label="RTK" color="#8b5cf6" />
              )}
              {selectedModel.thermalCapable && (
                <Badge icon={<Thermometer size={10} />} label="Termisk" color="#ef4444" />
              )}
              {selectedModel.multispectralCapable && (
                <Badge icon={<Cpu size={10} />} label="Multispektral" color="#22c55e" />
              )}
              {selectedModel.lidarCapable && (
                <Badge icon={<Cpu size={10} />} label="LiDAR" color="#6366f1" />
              )}
              {selectedModel.ndaaCompliant && (
                <Badge icon={<Shield size={10} />} label="NDAA" color="#0ea5e9" />
              )}
              {selectedModel.connectivity4G && (
                <Badge icon={<Wifi size={10} />} label="4G" color="#f59e0b" />
              )}
              <Badge
                icon={<Plane size={10} />}
                label={`${selectedModel.maxFlightTimeMin} min`}
                color="#6b7280"
              />
            </div>
          </div>
        )}

        {/* Serial number input */}
        {selectedModel && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text2)]">Serienummer</label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => handleSerialChange(e.target.value)}
              placeholder={selectedModel.serialPlaceholder}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono bg-[var(--bg3)] text-[var(--text)] focus:outline-none focus:ring-1 ${
                serialError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                  : 'border-[var(--border)] focus:border-[var(--green)] focus:ring-[var(--green)]/30'
              }`}
              maxLength={20}
            />
            {serialError && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                <AlertTriangle size={10} />
                {serialError}
              </div>
            )}
            {serialNumber && !serialError && validateSerial(serialNumber) && (
              <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                <CheckCircle2 size={10} />
                Serienumret ar giltigt
              </div>
            )}
          </div>
        )}

        {/* Cloud pairing instructions */}
        {selectedModel && (
          <div className="space-y-2">
            <button
              onClick={() => setShowPairing(!showPairing)}
              className="flex items-center gap-1.5 text-xs text-[var(--green)] hover:underline"
            >
              <Info size={12} />
              Molnkoppling — instruktioner
            </button>
            {showPairing && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3 text-xs text-[var(--text2)] leading-relaxed">
                <Wifi size={14} className="text-[var(--green)] mb-2" />
                {selectedModel.pairingInstructions}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text3)] hover:bg-[var(--bg3)] transition-colors"
            >
              Avbryt
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isValid && !submitting
                ? 'bg-[var(--green)] text-white hover:brightness-110'
                : 'bg-[var(--bg3)] text-[var(--text3)] cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="w-4 h-4 mx-auto rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              'Registrera dronare'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge Component ───

function Badge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {icon}
      {label}
    </span>
  );
}
