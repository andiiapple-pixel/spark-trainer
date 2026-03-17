import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ScreenHeader({ title, onBack, backLabel = 'Back', progress = null, hideBack = false }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
      <div className="flex items-center gap-3">
        {!hideBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm btn-press"
            style={{ color: '#64748b' }}
          >
            <ChevronLeft size={18} />
            <span>{backLabel}</span>
          </button>
        )}
        {title && (
          <h2 className="text-base font-semibold flex-1 text-center pr-12" style={{ color: '#f1f5f9' }}>
            {title}
          </h2>
        )}
      </div>
      {progress !== null && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1e1e2a' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, background: '#3b82f6' }}
          />
        </div>
      )}
    </div>
  );
}
