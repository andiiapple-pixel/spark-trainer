import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';
import { exercises as exercisesApi } from '../../services/api';
import LoadingState from '../shared/LoadingState';

const MUSCLE_POSITIONS = {
  chest:         { front: true,  cx: 160, cy: 120 },
  'front deltoid': { front: true, cx: 160, cy: 90 },
  'lateral deltoid': { front: true, cx: 120, cy: 95 },
  'rear deltoid': { front: false, cx: 120, cy: 95 },
  biceps:        { front: true,  cx: 110, cy: 140 },
  triceps:       { front: false, cx: 110, cy: 140 },
  lats:          { front: false, cx: 135, cy: 145 },
  rhomboids:     { front: false, cx: 160, cy: 130 },
  traps:         { front: false, cx: 160, cy: 100 },
  'lower back':  { front: false, cx: 160, cy: 175 },
  core:          { front: true,  cx: 160, cy: 175 },
  quadriceps:    { front: true,  cx: 155, cy: 255 },
  hamstrings:    { front: false, cx: 155, cy: 255 },
  glutes:        { front: false, cx: 160, cy: 215 },
  calves:        { front: false, cx: 155, cy: 330 },
  'hip flexors': { front: true,  cx: 155, cy: 225 },
  adductors:     { front: true,  cx: 160, cy: 265 },
  forearms:      { front: true,  cx: 105, cy: 175 },
};

export default function ExerciseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [activeTab, setActiveTab] = useState('instructions');

  useEffect(() => {
    exercisesApi.get(slug)
      .then(r => {
        setExercise(r.exercise);
        try {
          const saved = JSON.parse(localStorage.getItem('spark_fav_exercises') || '[]');
          setIsFav(saved.includes(r.exercise.id));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  function toggleFav() {
    const newVal = !isFav;
    setIsFav(newVal);
    try {
      const saved = JSON.parse(localStorage.getItem('spark_fav_exercises') || '[]');
      const next = newVal ? [...saved, exercise.id] : saved.filter(i => i !== exercise.id);
      localStorage.setItem('spark_fav_exercises', JSON.stringify(next));
    } catch {}
    if (newVal) exercisesApi.favourite(exercise.id).catch(() => {});
    else exercisesApi.unfavourite(exercise.id).catch(() => {});
  }

  if (loading) return <LoadingState message="Loading exercise..." />;
  if (!exercise) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A', color: '#FFFFFF' }}>
      Exercise not found.
    </div>
  );

  const ytQuery = exercise.video_search_query || exercise.name;
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery + ' exercise form')}`;

  const primaryMuscles = [exercise.primary_muscle];
  const secondaryMuscles = exercise.secondary_muscles || [];

  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto pb-24" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid #222222' }}>
        <button onClick={() => navigate(-1)} className="btn-press" style={{ color: '#555555' }}>
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {exercise.name}
          </h1>
        </div>
        <button onClick={toggleFav} className="btn-press p-1">
          <Star size={20} style={{ color: isFav ? '#E8FF00' : '#555555' }} fill={isFav ? '#E8FF00' : 'none'} />
        </button>
      </div>

      <div className="px-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 py-4" style={{ borderBottom: '1px solid #222222' }}>
          {exercise.difficulty && (
            <Tag label={exercise.difficulty} />
          )}
          {exercise.is_compound && <Tag label="Compound" />}
          {exercise.movement_pattern && <Tag label={exercise.movement_pattern} />}
          {exercise.exercise_type && <Tag label={exercise.exercise_type} />}
        </div>

        {/* Muscle diagram */}
        <MuscleDiagram primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} />

        {/* Muscles */}
        <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
          <div className="mb-2">
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#555555',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              PRIMARY
            </span>
            <span
              className="ml-2"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                color: '#E8FF00',
                textTransform: 'capitalize',
              }}
            >
              {exercise.primary_muscle}
            </span>
          </div>
          {secondaryMuscles.length > 0 && (
            <div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                SECONDARY
              </span>
              <span
                className="ml-2"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#888888',
                  textTransform: 'capitalize',
                }}
              >
                {secondaryMuscles.join(', ')}
              </span>
            </div>
          )}
          {exercise.equipment?.length > 0 && (
            <div className="mt-2">
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#555555',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                EQUIPMENT
              </span>
              <span
                className="ml-2"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#888888',
                  textTransform: 'capitalize',
                }}
              >
                {exercise.equipment.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid #222222' }}>
          {['instructions','cues','mistakes','progression'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 relative btn-press"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: activeTab === tab ? '#E8FF00' : '#555555',
                background: 'transparent',
                border: 'none',
              }}
            >
              {tab === 'cues' ? 'FORM CUES' : tab === 'mistakes' ? 'MISTAKES' : tab.toUpperCase()}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: '#E8FF00' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
          {activeTab === 'instructions' && (
            <ol className="space-y-4">
              {(exercise.instructions || []).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="flex-shrink-0 mt-0.5"
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#E8FF00',
                      width: '24px',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '1.6',
                      color: '#888888',
                    }}
                  >
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {activeTab === 'cues' && (
            <ul className="space-y-3">
              {(exercise.form_cues || []).map((cue, i) => (
                <li key={i} className="flex gap-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#888888' }}>
                  <span style={{ color: '#E8FF00' }}>+</span> {cue}
                </li>
              ))}
            </ul>
          )}
          {activeTab === 'mistakes' && (
            <ul className="space-y-3">
              {(exercise.common_mistakes || []).map((m, i) => (
                <li key={i} className="flex gap-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#888888' }}>
                  <span style={{ color: '#FFFFFF' }}>-</span> {m}
                </li>
              ))}
            </ul>
          )}
          {activeTab === 'progression' && (
            <div className="space-y-4">
              {exercise.beginner_modification && (
                <div>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#555555',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      marginBottom: '6px',
                    }}
                  >
                    EASIER VARIATION
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', lineHeight: '1.6', color: '#888888' }}>
                    {exercise.beginner_modification}
                  </p>
                </div>
              )}
              {exercise.advanced_progression && (
                <div>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#555555',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      marginBottom: '6px',
                    }}
                  >
                    HARDER PROGRESSION
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', lineHeight: '1.6', color: '#888888' }}>
                    {exercise.advanced_progression}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* YouTube link */}
        <a
          href={ytUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full py-4 btn-press"
          style={{
            background: 'transparent',
            borderBottom: '1px solid #222222',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              color: '#FFFFFF',
            }}
          >
            Watch on YouTube
          </span>
          <ExternalLink size={16} style={{ color: '#555555' }} />
        </a>
      </div>
    </div>
  );
}

function Tag({ label }) {
  return (
    <span
      className="px-3 py-1 capitalize"
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '11px',
        fontWeight: 500,
        color: '#555555',
        border: '1px solid #222222',
        borderRadius: '0px',
        background: 'transparent',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </span>
  );
}

function MuscleDiagram({ primaryMuscles, secondaryMuscles }) {
  return (
    <div className="py-4" style={{ borderBottom: '1px solid #222222' }}>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          color: '#555555',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '12px',
        }}
      >
        MUSCLES TARGETED
      </p>
      <div className="flex gap-4 justify-center">
        <BodySVG side="front" primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} />
        <BodySVG side="back" primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} />
      </div>
      <div className="flex gap-4 justify-center mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3" style={{ background: '#E8FF00' }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', color: '#555555' }}>Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3" style={{ background: 'rgba(232,255,0,0.3)' }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', color: '#555555' }}>Secondary</span>
        </div>
      </div>
    </div>
  );
}

function BodySVG({ side, primaryMuscles, secondaryMuscles }) {
  const isFront = side === 'front';
  const primary = 'rgba(232,255,0,0.75)';
  const secondary = 'rgba(232,255,0,0.3)';
  return (
    <svg width="80" height="180" viewBox="0 0 80 180">
      {/* Body outline */}
      <ellipse cx="40" cy="18" rx="12" ry="14" fill="#111111" stroke="#222222" strokeWidth="1" />
      <rect x="35" y="30" width="10" height="8" fill="#111111" stroke="#222222" strokeWidth="1" />
      <path d="M20 38 Q15 50 18 90 L62 90 Q65 50 60 38 Z" fill="#111111" stroke="#222222" strokeWidth="1" />
      <path d="M18 40 Q10 55 12 85 Q14 90 18 90 Q20 65 20 40" fill="#111111" stroke="#222222" strokeWidth="1" />
      <path d="M62 40 Q70 55 68 85 Q66 90 62 90 Q60 65 60 40" fill="#111111" stroke="#222222" strokeWidth="1" />
      <path d="M18 90 Q16 110 20 115 L60 115 Q64 110 62 90 Z" fill="#111111" stroke="#222222" strokeWidth="1" />
      <path d="M20 115 Q17 145 19 175 L35 175 Q36 145 33 115" fill="#111111" stroke="#222222" strokeWidth="1" />
      <path d="M60 115 Q63 145 61 175 L45 175 Q44 145 47 115" fill="#111111" stroke="#222222" strokeWidth="1" />

      {isFront && primaryMuscles.includes('chest') && (
        <ellipse cx="40" cy="60" rx="16" ry="12" fill={primary} />
      )}
      {isFront && (primaryMuscles.includes('core') || secondaryMuscles.includes('core')) && (
        <ellipse cx="40" cy="78" rx="10" ry="8"
          fill={primaryMuscles.includes('core') ? primary : secondary} />
      )}
      {isFront && (primaryMuscles.includes('quadriceps') || secondaryMuscles.includes('quadriceps')) && (
        <>
          <ellipse cx="28" cy="140" rx="8" ry="20"
            fill={primaryMuscles.includes('quadriceps') ? primary : secondary} />
          <ellipse cx="52" cy="140" rx="8" ry="20"
            fill={primaryMuscles.includes('quadriceps') ? primary : secondary} />
        </>
      )}
      {!isFront && (primaryMuscles.includes('hamstrings') || secondaryMuscles.includes('hamstrings')) && (
        <>
          <ellipse cx="28" cy="140" rx="8" ry="20"
            fill={primaryMuscles.includes('hamstrings') ? primary : secondary} />
          <ellipse cx="52" cy="140" rx="8" ry="20"
            fill={primaryMuscles.includes('hamstrings') ? primary : secondary} />
        </>
      )}
      {!isFront && (primaryMuscles.includes('glutes') || secondaryMuscles.includes('glutes')) && (
        <ellipse cx="40" cy="102" rx="18" ry="12"
          fill={primaryMuscles.includes('glutes') ? primary : secondary} />
      )}
      {!isFront && (primaryMuscles.includes('lats') || secondaryMuscles.includes('lats')) && (
        <>
          <ellipse cx="26" cy="65" rx="7" ry="18"
            fill={primaryMuscles.includes('lats') ? primary : secondary} />
          <ellipse cx="54" cy="65" rx="7" ry="18"
            fill={primaryMuscles.includes('lats') ? primary : secondary} />
        </>
      )}
      {!isFront && (primaryMuscles.includes('lower back') || secondaryMuscles.includes('lower back')) && (
        <ellipse cx="40" cy="82" rx="10" ry="8"
          fill={primaryMuscles.includes('lower back') ? primary : secondary} />
      )}
      {isFront && (primaryMuscles.includes('biceps') || secondaryMuscles.includes('biceps')) && (
        <>
          <ellipse cx="14" cy="62" rx="5" ry="12"
            fill={primaryMuscles.includes('biceps') ? primary : secondary} />
          <ellipse cx="66" cy="62" rx="5" ry="12"
            fill={primaryMuscles.includes('biceps') ? primary : secondary} />
        </>
      )}
      {!isFront && (primaryMuscles.includes('triceps') || secondaryMuscles.includes('triceps')) && (
        <>
          <ellipse cx="14" cy="62" rx="5" ry="12"
            fill={primaryMuscles.includes('triceps') ? primary : secondary} />
          <ellipse cx="66" cy="62" rx="5" ry="12"
            fill={primaryMuscles.includes('triceps') ? primary : secondary} />
        </>
      )}
      {isFront && (primaryMuscles.includes('front deltoid') || primaryMuscles.includes('shoulders') || secondaryMuscles.includes('front deltoid')) && (
        <>
          <ellipse cx="22" cy="44" rx="6" ry="6"
            fill={primaryMuscles.includes('front deltoid') || primaryMuscles.includes('shoulders') ? primary : secondary} />
          <ellipse cx="58" cy="44" rx="6" ry="6"
            fill={primaryMuscles.includes('front deltoid') || primaryMuscles.includes('shoulders') ? primary : secondary} />
        </>
      )}
      {!isFront && (primaryMuscles.includes('rear deltoid') || secondaryMuscles.includes('rear deltoid')) && (
        <>
          <ellipse cx="22" cy="44" rx="6" ry="6"
            fill={primaryMuscles.includes('rear deltoid') ? primary : secondary} />
          <ellipse cx="58" cy="44" rx="6" ry="6"
            fill={primaryMuscles.includes('rear deltoid') ? primary : secondary} />
        </>
      )}
      {(primaryMuscles.includes('calves') || secondaryMuscles.includes('calves')) && !isFront && (
        <>
          <ellipse cx="28" cy="163" rx="6" ry="10"
            fill={primaryMuscles.includes('calves') ? primary : secondary} />
          <ellipse cx="52" cy="163" rx="6" ry="10"
            fill={primaryMuscles.includes('calves') ? primary : secondary} />
        </>
      )}

      <text x="40" y="178" textAnchor="middle" fontSize="8" fill="#555555">{isFront ? 'Front' : 'Back'}</text>
    </svg>
  );
}
