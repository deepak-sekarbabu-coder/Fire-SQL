import React, { useState, useEffect } from 'react';
import { QueryHistoryItem } from '../types';

interface Props {
  history: QueryHistoryItem[];
  collections: string[];
  onAddCollection: (name: string) => void;
  onRemoveCollection: (name: string) => void;
  onSelectQuery: (q: string) => void;
  onCollectionClick?: (name: string) => void;
  onLogout: () => void;
  onConfig: () => void;
}

const Sidebar: React.FC<Props> = ({
  history,
  collections,
  onAddCollection,
  onRemoveCollection,
  onSelectQuery,
  onCollectionClick,
  onLogout,
  onConfig
}) => {
  const [newColName, setNewColName] = useState('');
  const [snippetCol, setSnippetCol] = useState<string>('');

  // Update the snippet collection default when collections change
  useEffect(() => {
    if (collections.length > 0) {
      // If currently selected snippet col is no longer in list, or none selected yet
      if (!snippetCol || !collections.includes(snippetCol)) {
        setSnippetCol(collections[0]);
      }
    } else {
      setSnippetCol('users');
    }
  }, [collections, snippetCol]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newColName.trim()) {
      onAddCollection(newColName.trim());
      setNewColName('');
    }
  };

  // Fallback if somehow empty
  const displayCol = snippetCol || 'users';

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-xs">
            FS
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">FireSQL</h1>
        </div>
        <p className="text-xs text-slate-500">Firestore Editor</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Collections Manager */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex justify-between items-center">
            <span>Collections</span>
            <span className="text-[10px] opacity-50 normal-case font-normal">(Client-side only)</span>
          </h3>

          <form onSubmit={handleAddSubmit} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Add Name..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-amber-500 outline-none"
            />
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-500 px-2 rounded flex items-center justify-center"
            >
              +
            </button>
          </form>

          <div className="space-y-1">
            {collections.map((col) => (
              <div key={col} className="group flex items-center gap-1">
                <button
                  onClick={() => onCollectionClick ? onCollectionClick(col) : onSelectQuery(`SELECT * FROM ${col} LIMIT 5`)}
                  className="flex-1 text-left text-xs font-medium bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-1.5 rounded transition-colors flex items-center gap-2"
                >
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  {col}
                </button>
                <button
                  onClick={() => onRemoveCollection(col)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                  title="Remove from list"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {collections.length === 0 && (
              <p className="text-xs text-slate-600 italic px-2">
                Add collections manually to quick access them.
              </p>
            )}
          </div>
        </div>

        {/* Syntax Help */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cheat Sheet
            </h3>
            {collections.length > 0 && (
               <select 
                  value={displayCol}
                  onChange={(e) => setSnippetCol(e.target.value)}
                  className="bg-slate-800 text-[10px] border border-slate-700 rounded px-1 py-0.5 text-slate-300 outline-none focus:border-amber-500 max-w-[120px] cursor-pointer"
               >
                 {collections.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            )}
          </div>
          
          <div className="space-y-2">
            {[
              `SELECT * FROM ${displayCol} LIMIT 5`,
              `SELECT * FROM ${displayCol} WHERE field = 'value'`,
              `INSERT INTO ${displayCol} JSON {"name": "New Item"}`,
              `UPDATE ${displayCol} SET JSON {"updated": true} WHERE id = "doc_id"`,
              `DELETE FROM ${displayCol} WHERE id = "doc_id"`
            ].map((snippet, i) => (
              <button
                key={i}
                onClick={() => onSelectQuery(snippet)}
                className="w-full text-left text-xs font-mono bg-slate-800/50 hover:bg-slate-800 p-2 rounded border border-slate-800/50 hover:border-slate-700 transition-colors truncate text-slate-400"
                title={snippet}
              >
                {snippet}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              History
            </h3>
            <div className="space-y-2">
              {history.slice().reverse().map((item, i) => (
                <button
                  key={i}
                  onClick={() => onSelectQuery(item.query)}
                  className={`w-full text-left text-xs p-2 rounded border transition-colors truncate font-mono ${item.status === 'error'
                      ? 'bg-red-900/10 border-red-900/20 text-red-300 hover:bg-red-900/20'
                      : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                >
                  {item.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-2">
        <button
          onClick={onConfig}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
        >
          Database Config
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;