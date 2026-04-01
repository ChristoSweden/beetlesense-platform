import { useState } from 'react';

interface SensorNode {
  id: string; name: string; location: string; lat: number; lng: number;
  temperature: number; humidity: number; soilMoisture: number;
  degreeDayAccum: number; batteryLevel: number; signalStrength: number;
  status: 'online' | 'warning' | 'offline'; lastReading: string;
  dailyReadings: { hour: number; temp: number; humidity: number }[];
}

const DEMO_SENSORS: SensorNode[] = [
  { id: 'sn1', name: 'Falun-N Alpha', location: 'Falun Nord, Stand A-3', lat: 60.61, lng: 15.63, temperature: 14.2, humidity: 72, soilMoisture: 34, degreeDayAccum: 298, batteryLevel: 87, signalStrength: 92, status: 'online', lastReading: '2 min ago', dailyReadings: Array.from({length: 24}, (_, h) => ({ hour: h, temp: 4 + Math.sin(h/4)*8 + Math.random()*2, humidity: 85 - Math.sin(h/4)*20 + Math.random()*5 })) },
  { id: 'sn2', name: 'Falun-N Beta', location: 'Falun Nord, Stand B-1', lat: 60.62, lng: 15.65, temperature: 13.8, humidity: 68, soilMoisture: 28, degreeDayAccum: 305, batteryLevel: 92, signalStrength: 88, status: 'online', lastReading: '5 min ago', dailyReadings: Array.from({length: 24}, (_, h) => ({ hour: h, temp: 3.5 + Math.sin(h/4)*7.5 + Math.random()*2, humidity: 82 - Math.sin(h/4)*18 + Math.random()*5 })) },
  { id: 'sn3', name: 'Sandviken Gamma', location: 'Sandviken Söder, Stand C-2', lat: 60.62, lng: 16.78, temperature: 12.5, humidity: 78, soilMoisture: 41, degreeDayAccum: 267, batteryLevel: 64, signalStrength: 71, status: 'warning', lastReading: '15 min ago', dailyReadings: Array.from({length: 24}, (_, h) => ({ hour: h, temp: 3 + Math.sin(h/4)*7 + Math.random()*2, humidity: 88 - Math.sin(h/4)*15 + Math.random()*5 })) },
  { id: 'sn4', name: 'Gävle Delta', location: 'Gävleborg, Stand D-5', lat: 60.67, lng: 17.14, temperature: 11.9, humidity: 81, soilMoisture: 45, degreeDayAccum: 276, batteryLevel: 45, signalStrength: 55, status: 'warning', lastReading: '32 min ago', dailyReadings: Array.from({length: 24}, (_, h) => ({ hour: h, temp: 2.5 + Math.sin(h/4)*6.5 + Math.random()*2, humidity: 90 - Math.sin(h/4)*12 + Math.random()*5 })) },
  { id: 'sn5', name: 'Karlstad Epsilon', location: 'Karlstad Väst, Stand E-1', lat: 59.38, lng: 13.50, temperature: 0, humidity: 0, soilMoisture: 0, degreeDayAccum: 245, batteryLevel: 12, signalStrength: 0, status: 'offline', lastReading: '4 hours ago', dailyReadings: Array.from({length: 24}, (_, h) => ({ hour: h, temp: 2 + Math.sin(h/4)*6 + Math.random()*2, humidity: 87 - Math.sin(h/4)*14 + Math.random()*5 })) },
];

export default function IoTSensorDashboardPage() {
  const [sensors] = useState<SensorNode[]>(DEMO_SENSORS);
  const [selectedSensor, setSelectedSensor] = useState<SensorNode | null>(null);

  const online = sensors.filter(s => s.status === 'online').length;
  const warning = sensors.filter(s => s.status === 'warning').length;
  const offline = sensors.filter(s => s.status === 'offline').length;
  const avgTemp = sensors.filter(s => s.status !== 'offline').reduce((a, s) => a + s.temperature, 0) / (online + warning || 1);

  const statusIcon = (s: string) => s === 'online' ? '🟢' : s === 'warning' ? '🟡' : '🔴';
  const statusBg = (s: string) => s === 'online' ? 'bg-green-50 border-green-300' : s === 'warning' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">IoT Sensor Network</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time microclimate monitoring for degree-day tracking and early bark beetle warning.</p>
          <p className="text-xs text-gray-500 mt-1">Hardware: LoRaWAN sensors | Update interval: 5 min | Degree-day threshold: 334°d above 5°C &lt;/p>
        </div>

        {/* Network KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border"&gt;<div className="text-2xl font-bold"&gt;{sensors.length}</div><div className="text-sm text-gray-500">Total Sensors</div></div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200"&gt;<div className="text-2xl font-bold text-green-600"&gt;{online}</div><div className="text-sm text-green-700">Online</div></div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"&gt;<div className="text-2xl font-bold text-yellow-600"&gt;{warning}</div><div className="text-sm text-yellow-700">Warning</div></div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200"&gt;<div className="text-2xl font-bold text-red-600"&gt;{offline}</div><div className="text-sm text-red-700">Offline</div></div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200"&gt;<div className="text-2xl font-bold text-blue-600"&gt;{avgTemp.toFixed(1)}°C &lt;/div><div className="text-sm text-blue-700">Avg Temperature</div></div>
        </div>

        {/* Sensor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {sensors.map(sensor => (
            <button key={sensor.id} onClick={() => setSelectedSensor(sensor)} className={`${statusBg(sensor.status)} border-2 rounded-xl p-5 text-left transition-all hover:shadow-lg ${selectedSensor?.id === sensor.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div><h3 className="font-bold text-gray-900"&gt;{sensor.name}</h3><p className="text-xs text-gray-500">{sensor.location}</p></div>
                <span className="text-lg">{statusIcon(sensor.status)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div><div className="text-xs text-gray-500"&gt;Temp</div><div className="font-bold">{sensor.temperature}°C &lt;/div></div>
                <div><div className="text-xs text-gray-500"&gt;Humidity</div><div className="font-bold">{sensor.humidity}%</div></div>
                <div><div className="text-xs text-gray-500"&gt;Soil</div><div className="font-bold">{sensor.soilMoisture}%</div></div>
              </div>
              <div className="mb-2"&gt;<div className="text-xs text-gray-500 mb-1"&gt;Degree-Days: {sensor.degreeDayAccum}/334</div><div className="w-full bg-gray-200 rounded-full h-2"&gt;<div className={`h-2 rounded-full ${sensor.degreeDayAccum > 300 ? 'bg-red-500' : sensor.degreeDayAccum &gt; 200 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (sensor.degreeDayAccum / 334) * 100)}%` }} /></div></div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Battery: {sensor.batteryLevel}%</span><span>Signal: {sensor.signalStrength}%</span><span>{sensor.lastReading}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selectedSensor && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedSensor.name} — Live Data</h2>
              <button onClick={() => setSelectedSensor(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><div className="text-sm text-gray-500"&gt;Temperature</div><div className="text-xl font-bold">{selectedSensor.temperature}°C &lt;/div></div>
              <div><div className="text-sm text-gray-500"&gt;Humidity</div><div className="text-xl font-bold">{selectedSensor.humidity}%</div></div>
              <div><div className="text-sm text-gray-500"&gt;Soil Moisture</div><div className="text-xl font-bold">{selectedSensor.soilMoisture}%</div></div>
              <div><div className="text-sm text-gray-500"&gt;Degree-Days</div><div className="text-xl font-bold">{selectedSensor.degreeDayAccum}°d</div></div>
            </div>
            {/* Mini chart - 24h temperature */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">24-Hour Temperature Profile</h3>
              <div className="flex items-end gap-1 h-24 bg-gray-50 rounded-lg p-2">
                {selectedSensor.dailyReadings.map((r, i) => {
                  const maxT = Math.max(...selectedSensor.dailyReadings.map(d => d.temp));
                  const minT = Math.min(...selectedSensor.dailyReadings.map(d => d.temp));
                  const pct = ((r.temp - minT) / (maxT - minT || 1)) * 100;
                  return <div key={i} className={`flex-1 rounded-t ${r.temp > 10 ? 'bg-orange-400' : r.temp &gt; 5 ? 'bg-yellow-400' : 'bg-blue-400'}`} style={{ height: `${Math.max(5, pct)}%` }} title={`${r.hour}:00 - ${r.temp.toFixed(1)}°C`} />;
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
            </div>
            {selectedSensor.status === 'offline' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-1">Sensor Offline</h3>
                <p className="text-sm text-red-700">Last reading {selectedSensor.lastReading}. Check battery ({selectedSensor.batteryLevel}%) and LoRaWAN gateway connectivity. Dispatch field technician if battery > 20%.</p>
              </div>
            )}
            {selectedSensor.degreeDayAccum > 280 && selectedSensor.status !== 'offline' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-1">Threshold Warning</h3>
                <p className="text-sm text-orange-700">Degree-day accumulation at {Math.round(selectedSensor.degreeDayAccum / 334 * 100)}% of swarming threshold. Estimated {Math.round((334 - selectedSensor.degreeDayAccum) / 8)} days to 334°d at current rate. Prepare pheromone traps.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}