import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Star, Filter, X } from 'lucide-react';
import { exercises as exercisesApi } from '../../services/api';
import ScreenHeader from '../shared/ScreenHeader';

const MUSCLE_GROUPS = ['chest','back','shoulders','arms','legs','core','cardio'];
const DIFFICULTIES = ['beginner','intermediate','advanced'];
const EQUIPMENT_LIST = ['barbell','dumbbells','bodyweight','cable machine','machine','kettlebell','resistance band'];

export default function ExerciseLibrary() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ muscle_group: '', difficulty: '', equipment: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [favourites, setFavourites] = useState(new Set());
  const [page, setPage] = useState(1);

  const load = useCallback(async (resetPage = false) => {
    setLoading(true);
    try {
      const p = resetPage ? 1 : page;
      const params = { page: p, limit: 30, ...filters };
      if (search) params.search = search;
      const res = await exercisesApi.list(params);
      setList(prev => (p === 1 ? res.exercises : [...prev, ...res.exercises]));
      setTotal(res.total);
      if (resetPage) setPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filters, page]);

  useEffect(() => { load(true); }, [search, filters]);
  useEffect(() => { if (page > 1) load(); }, [page]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('spark_fav_exercises') || '[]');
      setFavourites(new Set(saved));
    } catch {}
  }, []);

  function toggleFav(id, e) {
    e.stopPropagation();
    const next = new Set(favourites);
    if (next.has(id)) {
      next.delete(id);
      exercisesApi.unfavourite(id).catch(() => {});
    } else {
      next.add(id);
      exercisesApi.favourite(id).catch(() => {});
    }
    setFavourites(next);
    localStorage.setItem('spark_fav_exercises', JSON.stringify([...next]));
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24" style={{ background: '#0a0a0f' }}>
      <ScreenHeader title="Exercise Library" onBack={() => navigate(-1)} />

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-3 rounded-2xl" style={{ background: '#111118', border: '1px solid #2d2d3d' }}>
            <Search size={16} style={{ color: '#475569' }} />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#f8fafc', fontSize: 16 }}
              placeholder="Search exercises..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')}><X size={14} style={{ color: '#475569' }} /></button>}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-medium btn-press"
            style={{
              background: activeFilterCount > 0 ? 'rgba(99,102,241,0.15)' : '#111118',
              border: `1px solid ${activeFilterCount > 0 ? '#6366f1' : '#2d2d3d'}`,
              color: activeFilterCount > 0 ? '#818cf8' : '#94a3b8',
            }}
          >
            <Filter size={14} />
            {activeFilterCount > 0 ? activeFilterCount : ''}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 p-4 rounded-2xl space-y-3" style={{ background: '#111118', border: '1px solid #1e1e2e' }}>
            <FilterRow label="Muscle" options={MUSCLE_GROUPS} value={filters.muscle_group} onChange={v => setFilters(f => ({ ...f, muscle_group: v }))} />
            <FilterRow label="Difficulty" options={DIFFICULTIES} value={filters.difficulty} onChange={v => setFilters(f => ({ ...f, difficulty: v }))} />
            <FilterRow label="Equipment" options={EQUIPMENT_LIST} value={filters.equipment} onChange={v => setFilters(f => ({ ...f, equipment: v }))} />
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ muscle_group: '', difficulty: '', equipment: '' })}
                className="text-xs"
                style={{ color: '#f97316' }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Count */}
      <div className="px-5 pb-2">
        <p className="text-xs" style={{ color: '#475569' }}>
          {loading && list.length === 0 ? 'Loading...' : `${total} exercises`}
        </p>
      </div>

      {/* List */}
      <div className="px-5 space-y-2">
        {list.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            isFav={favourites.has(ex.id)}
            onFav={toggleFav}
            onClick={() => navigate(`/exercises/${ex.slug}`)}
          />
        ))}
        {list.length < total && !loading && (
          <button
            onClick={() => setPage(p => p + 1)}
            className="w-full py-3 rounded-full text-sm font-medium btn-press"
            style={{ background: '#111118', color: '#818cf8', border: '1px solid #2d2d3d' }}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, options, value, onChange }) {
  return (
    <div>
      <p className="text-xs mb-1.5 font-semibold" style={{ color: '#475569', letterSpacing: '0.05em' }}>{label.toUpperCase()}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(value === o ? '' : o)}
            className="px-2.5 py-1 rounded-full text-xs capitalize btn-press"
            style={{
              background: value === o ? 'rgba(99,102,241,0.15)' : '#1a1a24',
              color: value === o ? '#818cf8' : '#94a3b8',
              border: `1px solid ${value === o ? '#6366f150' : '#2d2d3d'}`,
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({ exercise, isFav, onFav, onClick }) {
  const diffColor = { beginner: '#10b981', intermediate: '#f97316', advanced: '#ef4444' };
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl flex items-center gap-3 btn-press"
      style={{ background: '#111118', border: '1px solid #1e1e2e' }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: '#f8fafc' }}>{exercise.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs capitalize" style={{ color: '#475569' }}>{exercise.primary_muscle}</span>
          {exercise.is_compound && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#1a1a24', color: '#94a3b8', border: '1px solid #2d2d3d' }}>compound</span>
          )}
          {exercise.difficulty && (
            <span className="text-xs capitalize" style={{ color: diffColor[exercise.difficulty] || '#94a3b8' }}>
              {exercise.difficulty}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={e => onFav(exercise.id, e)}
        className="p-1.5 rounded-lg btn-press"
        style={{ color: isFav ? '#f59e0b' : '#2d2d3d' }}
      >
        <Star size={16} fill={isFav ? '#f59e0b' : 'none'} />
      </button>
    </button>
  );
}
