import React, { useState } from 'react';
import { FirebaseConfig } from '../types';

interface Props {
  onSave: (config: FirebaseConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<FirebaseConfig>;
}

const ConfigModal: React.FC<Props> = ({ onSave, onCancel, initialConfig }) => {
  const [jsonInput, setJsonInput] = useState(
    initialConfig ? JSON.stringify(initialConfig, null, 2) :
      `{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}`
  );
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      const config = JSON.parse(jsonInput);

      // Specific check for Service Account Key (server-side)
      if (config.type === 'service_account' || config.private_key) {
        throw new Error(
          "This looks like a Service Account Key (server-side). This app requires the Client Web SDK config (apiKey, authDomain, etc.) found in Firebase Console > Project Settings > General > Your Apps."
        );
      }

      // Basic validation
      if (!config.projectId || !config.apiKey) {
        throw new Error("Config must contain at least 'projectId' and 'apiKey'");
      }
      onSave(config);
    } catch (e: any) {
      setError(e.message || "Invalid JSON");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-100 p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Connect Database</h2>
          <p className="text-sm text-slate-500">Paste your Firebase Web SDK configuration object below.</p>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setError('');
            }}
            className={`w-full h-64 p-3 font-mono text-sm bg-slate-900 text-green-400 rounded-lg focus:ring-2 outline-none resize-none ${error ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
            spellCheck={false}
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex gap-2 items-start">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={() => {
              setJsonInput(`{
  "apiKey": "",
  "authDomain": "",
  "projectId": "",
  "storageBucket": "",
  "messagingSenderId": "",
  "appId": ""
}`);
              setError('');
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;