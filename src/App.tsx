import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import ConfigModal from './components/ConfigModal';
import Sidebar from './components/Sidebar';
import ResultsTable from './components/ResultsTable';
import { runQuery } from './services/queryEngine';
import { initializeFirebase, isFirebaseInitialized, executeUpdate, executeInsert } from './services/firebaseService';
import { AppState, FirebaseConfig, QueryHistoryItem, QueryResult } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [query, setQuery] = useState<string>('SELECT * FROM users LIMIT 5');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [config, setConfig] = useState<FirebaseConfig | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  // Stack of cursors. Index 0 is for Page 1 (null), Index 1 is for Page 2 (startAfter doc of Page 1), etc.
  const [cursors, setCursors] = useState<any[]>([null]); 
  
  // Pre-populated with collections from the user's screenshot
  const [collections, setCollections] = useState<string[]>([
    'apartments',
    'balanceSheets',
    'categories',
    'expenses',
    'payments',
    'users',
    'vendors'
  ]);

  useEffect(() => {
    // Load saved collections from local storage
    const savedCols = localStorage.getItem('fireSQL_collections');
    if (savedCols) {
      try {
        const parsed = JSON.parse(savedCols);
        // Only override if the user has actually saved a different list previously
        if (Array.isArray(parsed) && parsed.length > 0) {
            setCollections(parsed);
        }
      } catch (e) {
        console.error("Error parsing saved collections", e);
      }
    }
  }, []);

  useEffect(() => {
    // If we have config but app isn't initialized, init it.
    if (config && !isFirebaseInitialized()) {
      const success = initializeFirebase(config);
      if (!success) {
        alert("Failed to initialize Firebase with provided config.");
      }
    }
  }, [config]);

  const handleLoginSuccess = () => {
    // Check if we have saved config in localstorage (simulation) or just go to config
    if (config && isFirebaseInitialized()) {
      setAppState(AppState.EDITOR);
    } else {
      setAppState(AppState.CONFIG);
    }
  };

  const handleConfigSave = (newConfig: FirebaseConfig) => {
    setConfig(newConfig);
    const success = initializeFirebase(newConfig);
    if (success) {
      setAppState(AppState.EDITOR);
    } else {
      alert("Could not connect to Firebase. Check console for errors.");
    }
  };

  const handleConfigCancel = () => {
    // If we are already connected, go back to editor. 
    // If not connected (initial setup), go back to login.
    if (isFirebaseInitialized()) {
      setAppState(AppState.EDITOR);
    } else {
      setAppState(AppState.LOGIN);
    }
  };

  const handleAddCollection = (name: string) => {
    if (name && !collections.includes(name)) {
      const newCols = [...collections, name];
      setCollections(newCols);
      localStorage.setItem('fireSQL_collections', JSON.stringify(newCols));
    }
  };

  const handleRemoveCollection = (name: string) => {
    const newCols = collections.filter(c => c !== name);
    setCollections(newCols);
    localStorage.setItem('fireSQL_collections', JSON.stringify(newCols));
  };

  // Core execution wrapper
  const fetchData = async (q: string, cursor: any) => {
      setLoading(true);
      const res = await runQuery(q, cursor);
      setResult(res);
      setLoading(false);
      return res;
  };

  const handleRunQuery = async (overrideQuery?: string) => {
    const qToRun = overrideQuery || query;
    if (!qToRun.trim()) return;
    
    // Reset pagination for fresh queries
    setPage(1);
    setCursors([null]);
    
    const res = await fetchData(qToRun, null);

    setHistory(prev => [...prev, { 
      query: qToRun, 
      timestamp: Date.now(), 
      status: res.type === 'error' ? 'error' : 'success' 
    }]);
  };
  
  // Specific handler for Sidebar clicks to auto-execute
  const handleCollectionSelect = (colName: string) => {
      const autoQuery = `SELECT * FROM ${colName} LIMIT 5`;
      setQuery(autoQuery);
      handleRunQuery(autoQuery);
  };

  const handleNextPage = async () => {
      if (!result || !result.lastDoc) return;

      const nextCursor = result.lastDoc;
      
      // If we haven't visited this page before, store the cursor
      // cursors[0] = null (Page 1 start)
      // cursors[1] = Page 1 last doc (Page 2 start)
      const nextPageIdx = page;
      const newCursors = [...cursors];
      if (!newCursors[nextPageIdx]) {
          newCursors[nextPageIdx] = nextCursor;
          setCursors(newCursors);
      }

      setPage(p => p + 1);
      await fetchData(query, nextCursor);
  };

  const handlePrevPage = async () => {
      if (page <= 1) return;
      
      const prevPage = page - 1;
      // The cursor for Page N is at index N-1
      // Page 1: cursors[0] (null)
      // Page 2: cursors[1]
      const prevCursor = cursors[prevPage - 1];
      
      setPage(prevPage);
      await fetchData(query, prevCursor);
  };

  const handleCellUpdate = async (docId: string, field: string, value: any) => {
    if (!result || !result.collectionName) return;
    
    const col = result.collectionName;

    // 1. Optimistic Update (UI updates immediately)
    setResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        rows: prev.rows.map(r => {
          if (r.id === docId) {
            return { ...r, [field]: value };
          }
          return r;
        })
      };
    });

    try {
      // 2. Actual Update
      await executeUpdate(col, docId, { [field]: value });
      
      // 3. Log to history (simulating a query)
      const valStr = typeof value === 'object' ? 'JSON {...}' : String(value);
      setHistory(prev => [...prev, { 
        query: `UPDATE ${col} SET ${field} = ${valStr} WHERE id = '${docId}' (Inline Edit)`, 
        timestamp: Date.now(), 
        status: 'success' 
      }]);
    } catch (e: any) {
      console.error("Update failed", e);
      alert(`Failed to save changes: ${e.message}`);
      // Ideally revert optimistic update here, but simplifying for now
    }
  };

  const handleRowInsert = async (data: any) => {
    if (!result || !result.collectionName) return;
    const col = result.collectionName;
    
    try {
       const newDoc = await executeInsert(col, data);
       
       // Optimistic update
       setResult(prev => {
           if (!prev) return null;
           return {
               ...prev,
               rows: [newDoc, ...prev.rows],
               message: `Document added locally. (ID: ${newDoc.id})`
           }
       });
       
       // History
       setHistory(prev => [...prev, {
           query: `INSERT INTO ${col} JSON ${JSON.stringify(data)}`,
           timestamp: Date.now(),
           status: 'success'
       }]);
    } catch(e: any) {
        alert("Failed to insert: " + e.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleRunQuery();
    }
  };

  if (appState === AppState.LOGIN) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full bg-white">
      {appState === AppState.CONFIG && (
        <ConfigModal 
            onSave={handleConfigSave} 
            onCancel={handleConfigCancel}
            initialConfig={config || undefined} 
        />
      )}

      {/* Layout when in Editor Mode (Or Config mode hidden in background) */}
      <Sidebar 
        history={history} 
        collections={collections}
        onAddCollection={handleAddCollection}
        onRemoveCollection={handleRemoveCollection}
        onSelectQuery={setQuery} // For cheatsheet/history
        onCollectionClick={handleCollectionSelect} // For direct clicks
        onLogout={() => {
            setAppState(AppState.LOGIN);
            setHistory([]);
            setResult(null);
            setPage(1);
            setCursors([null]);
        }}
        onConfig={() => setAppState(AppState.CONFIG)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Query Editor Section */}
        <div className="h-1/3 min-h-[200px] border-b border-slate-200 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
             <span className="text-xs font-semibold text-slate-500">SQL QUERY EDITOR</span>
             <div className="text-xs text-slate-400 flex gap-2">
                <span>CMD+ENTER to Run</span>
             </div>
          </div>
          <div className="flex-1 relative group">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-4 font-mono text-sm text-slate-800 outline-none resize-none"
              placeholder="SELECT * FROM collection LIMIT 5"
              spellCheck={false}
            />
            <button
                onClick={() => handleRunQuery()}
                disabled={loading}
                className="absolute bottom-4 right-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-full shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
                {loading ? 'Running...' : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        RUN
                    </>
                )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <ResultsTable 
            result={result} 
            loading={loading} 
            onUpdateCell={handleCellUpdate}
            onInsertRow={handleRowInsert}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            page={page}
        />
      </main>
    </div>
  );
};

export default App;