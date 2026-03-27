import { useState } from 'react';
import { X } from 'lucide-react';

const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATE_COLORS = {
  25: '#ef4444', 20: '#3b82f6', 15: '#f59e0b', 10: '#10b981',
  5: '#f1f5f9', 2.5: '#555555', 1.25: '#E8FF00',
  45: '#ef4444', 35: '#3b82f6', 35: '#f59e0b', 10: '#10b981',
};

const PLATE_COLOR_MAP = {
  25: '#ef4444', 20: '#3b82f6', 15: '#f59e0b', 10: '#10b981',
  5: '#e2e8f0', 2.5: '#555555', 1.25: '#E8FF00',
  45: '#ef4444', 35: '#3b82f6', 'other': '#888888'
};

function calcPlates(targetWeight, barbellWeight, unit) {
  const plates = unit === 'kg' ? PLATES_KG : PLATES_LBS;
  let remaining = (targetWeight - barbellWeight) / 2;
  const result = [];
  if (remaining < 0) return result;
  for (const p of plates) {
    const count = Math.floor(remaining / p);
    if (count > 0) {
      result.push({ weight: p, count });
      remaining -= count * p;
      remaining = Math.round(remaining * 100) / 100;
    }
  }
  return result;
}

function calcWarmups(workingWeight, sets = 4) {
  const warmupSets = [];
  const percentages = sets === 2 ? [0.5, 0.75] :
    sets === 3 ? [0.4, 0.6, 0.8] :
    sets === 4 ? [0.4, 0.6, 0.75, 0.9] :
    [0.3, 0.5, 0.65, 0.8, 0.9];

  const repsMap = [10, 8, 5, 3, 2, 1];
  percentages.forEach((pct, i) => {
    const w = Math.round(workingWeight * pct / 2.5) * 2.5;
    warmupSets.push({ weight: w, reps: repsMap[i] || 2, pct: Math.round(pct * 100) });
  });
  return warmupSets;
}

export default function PlateCalculator({ onClose }) {
  const [tab, setTab] = useState('plates');
  const [unit, setUnit] = useState('kg');
  const [targetWeight, setTargetWeight] = useState('');
  const [barbellWeight, setBarbellWeight] = useState(unit === 'kg' ? '20' : '45');
  const [warmupSets, setWarmupSets] = useState(4);

  const target = parseFloat(targetWeight) || 0;
  const barbell = parseFloat(barbellWeight) || 20;
  const plates = target > 0 ? calcPlates(target, barbell, unit) : [];
  const warmups = target > 0 ? calcWarmups(target, warmupSets) : [];

  function switchUnit(u) {
    setUnit(u);
    setBarbellWeight(u === 'kg' ? '20' : '45');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-[430px] rounded-none p-5 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ background: '#111111', border: '1px solid #222222' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg" style={{ color: '#FFFFFF' }}>Calculator</h2>
          <button onClick={onClose} className="btn-press p-1"><X size={20} style={{ color: '#555555' }} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4" style={{ borderColor: '#222222' }}>
          {['plates', 'warmup'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold relative btn-press"
              style={{ color: tab === t ? '#818cf8' : '#555555' }}>
              {t === 'plates' ? 'Plate Calculator' : 'Warm-up Calculator'}
              {tab === t && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full" style={{ background: '#E8FF00' }} />
              )}
            </button>
          ))}
        </div>

        {/* Unit toggle */}
        <div className="flex gap-2 mb-4">
          {['kg', 'lbs'].map(u => (
            <button key={u} onClick={() => switchUnit(u)}
              className="px-4 py-1.5 text-sm font-medium btn-press"
              style={{
                background: unit === u ? 'rgba(99,102,241,0.15)' : '#111111',
                color: unit === u ? '#818cf8' : '#888888',
                border: `1px solid ${unit === u ? '#E8FF0050' : '#222222'}`,
              }}>
              {u}
            </button>
          ))}
        </div>

        {/* Target weight input */}
        <div className="mb-3">
          <label className="text-xs font-semibold mb-1 block" style={{ color: '#555555', letterSpacing: '0.05em' }}>
            {tab === 'plates' ? 'TARGET WEIGHT' : 'WORKING WEIGHT'}
          </label>
          <div className="flex items-center gap-2 px-3 py-3 rounded-none" style={{ background: '#111111', border: '1px solid #222222' }}>
            <input
              type="number"
              className="flex-1 bg-transparent text-lg font-bold outline-none tabular-nums"
              style={{ color: '#FFFFFF', fontSize: 20 }}
              placeholder="0"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
            />
            <span className="text-sm" style={{ color: '#555555' }}>{unit}</span>
          </div>
        </div>

        {tab === 'plates' && (
          <>
            <div className="mb-4">
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#555555', letterSpacing: '0.05em' }}>BARBELL WEIGHT</label>
              <div className="flex gap-2">
                {(unit === 'kg' ? ['15', '20', 'custom'] : ['35', '45', 'custom']).map(w => (
                  <button key={w} onClick={() => w !== 'custom' && setBarbellWeight(w)}
                    className="flex-1 py-2 rounded-none text-sm btn-press"
                    style={{
                      background: barbellWeight === w ? 'rgba(99,102,241,0.15)' : '#111111',
                      color: barbellWeight === w ? '#818cf8' : '#888888',
                      border: `1px solid ${barbellWeight === w ? '#E8FF0050' : '#222222'}`,
                    }}>
                    {w === 'custom' ? (
                      <input type="number" className="w-full text-center bg-transparent outline-none text-sm"
                        style={{ color: '#FFFFFF' }}
                        placeholder="other"
                        value={['15','20','35','45'].includes(barbellWeight) ? '' : barbellWeight}
                        onChange={e => setBarbellWeight(e.target.value)} />
                    ) : `${w}${unit}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual plate display */}
            {target > 0 && (
              <div className="rounded-none p-4" style={{ background: '#0A0A0A', border: '1px solid #222222' }}>
                <p className="text-xs font-semibold mb-3 text-center" style={{ color: '#555555', letterSpacing: '0.06em' }}>EACH SIDE</p>
                {plates.length === 0 ? (
                  <p className="text-center text-sm" style={{ color: '#555555' }}>Weight equals barbell — no plates needed</p>
                ) : (
                  <div className="flex items-center gap-2 mb-4 justify-center flex-wrap">
                    {plates.map((p, i) => (
                      Array.from({ length: p.count }).map((_, j) => (
                        <PlateVisual key={`${i}-${j}`} weight={p.weight} unit={unit} />
                      ))
                    ))}
                  </div>
                )}
                {plates.length > 0 && (
                  <div className="space-y-1">
                    {plates.map(p => (
                      <div key={p.weight} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: PLATE_COLOR_MAP[p.weight] || '#888888' }} />
                          <span style={{ color: '#FFFFFF' }}>{p.weight}{unit}</span>
                        </div>
                        <span style={{ color: '#888888' }}>× {p.count} per side</span>
                      </div>
                    ))}
                    <div className="border-t mt-2 pt-2" style={{ borderColor: '#222222' }}>
                      <div className="flex justify-between text-sm font-semibold">
                        <span style={{ color: '#888888' }}>Total</span>
                        <span style={{ color: '#FFFFFF' }}>{target}{unit}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'warmup' && (
          <>
            <div className="mb-4">
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#555555', letterSpacing: '0.05em' }}>WARM-UP SETS</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setWarmupSets(n)}
                    className="flex-1 py-2 rounded-none text-sm font-medium btn-press"
                    style={{
                      background: warmupSets === n ? 'rgba(99,102,241,0.15)' : '#111111',
                      color: warmupSets === n ? '#818cf8' : '#888888',
                      border: `1px solid ${warmupSets === n ? '#E8FF0050' : '#222222'}`,
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {target > 0 && (
              <div className="space-y-2">
                {warmups.map((set, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-none" style={{ background: '#0A0A0A', border: '1px solid #222222' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#111111', color: '#888888' }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm tabular-nums" style={{ color: '#FFFFFF' }}>{set.weight}{unit} × {set.reps}</span>
                      <span className="text-xs ml-2" style={{ color: '#555555' }}>{set.pct}% of working weight</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 rounded-none" style={{ background: 'rgba(232,255,0,0.1)', border: '1px solid #E8FF0040' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>W</div>
                  <span className="font-semibold text-sm tabular-nums" style={{ color: '#818cf8' }}>{target}{unit} — Working sets</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PlateVisual({ weight, unit }) {
  const color = PLATE_COLOR_MAP[weight] || '#888888';
  const height = Math.max(24, Math.min(60, weight * 2));
  return (
    <div className="flex flex-col items-center justify-center rounded-sm text-xs font-bold"
      style={{ background: color, width: 18, height, color: '#fff', fontSize: 9, writingMode: 'vertical-rl' }}>
      {weight}
    </div>
  );
}
