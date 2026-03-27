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
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4" style={{ borderBottom: '1px solid #222222' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-press" style={{ color: '#555555' }}>
            <ChevronLeft size={22} />
          </button>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            EXERCISES
          </h1>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 px-3 py-3"
          style={{
            background: '#111111',
            border: '1px solid #222222',
            borderRadius: '0px',
          }}
        >
          <Search size={16} style={{ color: '#555555' }} />
          <input
            className="flex-1 bg-transparent outline-none"
            style={{
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
              fontSize: '15px',
              fontWeight: 400,
            }}
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} style={{ color: '#555555' }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {MUSCLE_GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setFilters(f => ({ ...f, muscle_group: f.muscle_group === g ? '' : g }))}
              className="flex-shrink-0 px-3 py-1.5 btn-press"
              style={{
                background: filters.muscle_group === g ? '#E8FF00' : 'transparent',
                border: filters.muscle_group === g ? '1px solid #E8FF00' : '1px solid #222222',
                borderRadius: '0px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: filters.muscle_group === g ? '#000000' : '#555555',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable filters */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-1.5 btn-press"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            fontWeight: 500,
            color: activeFilterCount > 0 ? '#E8FF00' : '#555555',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          <Filter size={12} />
          {activeFilterCount > 0 ? `${activeFilterCount} FILTER${activeFilterCount > 1 ? 'S' : ''}` : 'FILTERS'}
        </button>

        {showFilters && (
          <div className="mt-3 py-3" style={{ borderTop: '1px solid #222222', borderBottom: '1px solid #222222' }}>
            <FilterRow label="Difficulty" options={DIFFICULTIES} value={filters.difficulty} onChange={v => setFilters(f => ({ ...f, difficulty: v }))} />
            <FilterRow label="Equipment" options={EQUIPMENT_LIST} value={filters.equipment} onChange={v => setFilters(f => ({ ...f, equipment: v }))} />
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ muscle_group: '', difficulty: '', equipment: '' })}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: '#E8FF00',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  marginTop: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                CLEAR ALL
              </button>
            )}
          </div>
        )}
      </div>

      {/* Count */}
      <div className="px-4 pb-2">
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '10px',
            fontWeight: 400,
            color: '#555555',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {loading && list.length === 0 ? 'Loading...' : `${total} exercises`}
        </p>
      </div>

      {/* List */}
      <div className="px-0">
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
            className="w-full py-4 btn-press"
            style={{
              background: 'transparent',
              borderTop: '1px solid #222222',
              borderBottom: '1px solid #222222',
              borderLeft: 'none',
              borderRight: 'none',
              borderRadius: '0px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '12px',
              fontWeight: 500,
              color: '#E8FF00',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            LOAD MORE
          </button>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, options, value, onChange }) {
  return (
    <div className="mb-3">
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          color: '#555555',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '8px',
        }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(value === o ? '' : o)}
            className="px-3 py-1.5 btn-press"
            style={{
              background: value === o ? '#E8FF00' : 'transparent',
              color: value === o ? '#000000' : '#555555',
              border: value === o ? '1px solid #E8FF00' : '1px solid #222222',
              borderRadius: '0px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'capitalize',
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
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(e); }}
      className="w-full text-left flex items-center gap-3 px-4 py-3.5 btn-press"
      style={{
        background: 'transparent',
        borderBottom: '1px solid #222222',
        borderRadius: '0px',
        cursor: 'pointer',
      }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '15px',
            fontWeight: 500,
            color: '#FFFFFF',
          }}
        >
          {exercise.name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              fontWeight: 400,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {exercise.primary_muscle}
          </span>
          {exercise.is_compound && (
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '10px',
                fontWeight: 400,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              COMPOUND
            </span>
          )}
        </div>
      </div>
      <button
        onClick={e => onFav(exercise.id, e)}
        className="p-1.5 btn-press"
        style={{
          color: isFav ? '#E8FF00' : '#555555',
          background: 'transparent',
          border: 'none',
        }}
      >
        <Star size={16} fill={isFav ? '#E8FF00' : 'none'} />
      </button>
    </div>
  );
}
