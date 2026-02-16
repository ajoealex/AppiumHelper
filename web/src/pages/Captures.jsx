import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

export default function Captures({ onBack }) {
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingName, setDeletingName] = useState('');
  const [renamingName, setRenamingName] = useState('');
  const [imageErrors, setImageErrors] = useState({});

  const loadCaptures = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCaptures();
      setCaptures(Array.isArray(data) ? data : []);
      setImageErrors({});
    } catch (err) {
      setError(err?.message || 'Failed to load captures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptures();
  }, [loadCaptures]);

  const handleOpen = (captureName) => {
    window.open(api.getViewerUrl(captureName), '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (captureName) => {
    if (!window.confirm(`Delete capture "${captureName}" from disk?`)) {
      return;
    }

    setDeletingName(captureName);
    setError('');
    try {
      await api.deleteCapture(captureName);
      setCaptures((prev) => prev.filter((capture) => capture.name !== captureName));
    } catch (err) {
      setError(err?.message || 'Failed to delete capture');
    } finally {
      setDeletingName('');
    }
  };

  const handleRename = async (captureName) => {
    const currentName = captureName || '';
    const nextName = window.prompt('Enter a new capture name:', currentName)?.trim();

    if (!nextName || nextName === currentName) {
      return;
    }

    setRenamingName(currentName);
    setError('');
    try {
      await api.renameCapture(currentName, nextName);
      setCaptures((prev) =>
        prev.map((capture) =>
          capture.name === currentName ? { ...capture, name: nextName } : capture
        )
      );
      setImageErrors((prev) => {
        if (!prev[currentName]) return prev;
        const next = { ...prev };
        next[nextName] = prev[currentName];
        delete next[currentName];
        return next;
      });
    } catch (err) {
      setError(err?.message || 'Failed to rename capture');
    } finally {
      setRenamingName('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Saved Captures</h1>
            <p className="text-sm text-gray-400 mt-1">
              {captures.length} capture{captures.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadCaptures}
              className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800/50 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-8 text-center text-gray-300">
            Loading captures...
          </div>
        ) : captures.length === 0 ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800/70 p-8 text-center text-gray-300">
            No saved captures found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 gap-4">
            {captures.map((capture) => {
              const showImage = capture.metadata?.hasScreenshot !== false && !imageErrors[capture.name];
              return (
                <article
                  key={capture.name}
                  className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/80 shadow-lg"
                >
                  <div className="h-100 bg-gray-900 flex items-center justify-center overflow-hidden border-b border-gray-700">
                    {showImage ? (
                      <img
                        src={api.getScreenshotUrl(capture.name)}
                        alt={capture.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        onError={() =>
                          setImageErrors((prev) => ({
                            ...prev,
                            [capture.name]: true
                          }))
                        }
                      />
                    ) : (
                      <span className="text-sm text-gray-400">Screenshot not available</span>
                    )}
                  </div>

                  <div className="p-4">
                    <h2 className="text-sm font-semibold text-white break-all mb-3">{capture.name}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpen(capture.name)}
                        disabled={renamingName === capture.name || deletingName === capture.name}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors cursor-pointer"
                        title="Open in viewer"
                      >
                        <span className="inline-flex items-center gap-1">
                          Open
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12v7a2 2 0 002 2h7" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRename(capture.name)}
                        disabled={renamingName === capture.name || deletingName === capture.name}
                        className="flex-1 px-3 py-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors cursor-pointer"
                      >
                        {renamingName === capture.name ? 'Renaming...' : 'Rename'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(capture.name)}
                        disabled={renamingName === capture.name || deletingName === capture.name}
                        className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors cursor-pointer"
                      >
                        {deletingName === capture.name ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
