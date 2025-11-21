import React, { useState, useEffect, useRef } from 'react';
import { QueryResult } from '../types';

interface Props {
  result: QueryResult | null;
  loading: boolean;
  onUpdateCell?: (docId: string, field: string, value: any) => void;
  onInsertRow?: (data: any) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  page?: number;
}

interface InsertField {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'null';
}

const ResultsTable: React.FC<Props> = ({ result, loading, onUpdateCell, onInsertRow, onNextPage, onPrevPage, page = 1 }) => {
  const [editingLoc, setEditingLoc] = useState<{ id: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editType, setEditType] = useState<'string' | 'number' | 'boolean' | 'json' | 'null'>('string');
  
  // Insert Modal State
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertFields, setInsertFields] = useState<InsertField[]>([]);

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingLoc && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingLoc]);

  // Handle Click Outside to Save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingLoc && editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    // Use mousedown to capture the event before focus changes
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingLoc, editValue, editType]); // Dependencies required for handleSave closure

  const handleStartEdit = (id: string, col: string, currentVal: any) => {
    // Explicitly prevent editing ID column
    if (col === 'id' || !onUpdateCell || result?.type !== 'read') return;

    setEditingLoc({ id, col });
    
    // Determine Initial Type & Value
    let type: 'string' | 'number' | 'boolean' | 'json' | 'null' = 'string';
    let initialEditValue = '';

    if (currentVal === null) {
      type = 'null';
    } else if (currentVal === undefined) {
      // Treat undefined as null for editing purposes
      type = 'null'; 
    } else if (typeof currentVal === 'number') {
      type = 'number';
      initialEditValue = String(currentVal);
    } else if (typeof currentVal === 'boolean') {
      type = 'boolean';
      initialEditValue = String(currentVal);
    } else if (typeof currentVal === 'object') {
      type = 'json';
      initialEditValue = JSON.stringify(currentVal, null, 2);
    } else {
      // Default to String (catches strings and edge cases)
      type = 'string';
      initialEditValue = String(currentVal);
    }
    
    setEditType(type);
    setEditValue(initialEditValue);
  };

  const handleSave = () => {
    if (!editingLoc || !onUpdateCell) return;

    let finalVal: any = editValue;

    try {
      switch (editType) {
        case 'number':
          if (editValue.trim() === '') finalVal = 0; 
          else finalVal = Number(editValue);
          break;
        case 'boolean':
          finalVal = (editValue.toLowerCase() === 'true');
          break;
        case 'null':
          finalVal = null;
          break;
        case 'json':
          finalVal = JSON.parse(editValue);
          break;
        case 'string':
        default:
          finalVal = String(editValue);
          break;
      }
    } catch (e) {
      alert("Invalid format for selected type (e.g., Invalid JSON). Please fix or switch type.");
      return; // Abort save to let user fix it
    }

    onUpdateCell(editingLoc.id, editingLoc.col, finalVal);
    setEditingLoc(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingLoc(null);
    }
    // Enter saves, but Shift+Enter allows newlines in textarea
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleExportCSV = () => {
    if (!result || !result.rows.length) return;

    const headers = result.columns.join(',');
    
    const csvRows = result.rows.map(row => {
      return result.columns.map(col => {
        const val = row[col];
        let stringVal = '';
        
        if (val === null || val === undefined) {
          stringVal = '';
        } else if (typeof val === 'object') {
          stringVal = JSON.stringify(val).replace(/"/g, '""');
        } else {
          stringVal = String(val).replace(/"/g, '""');
        }

        if (/[",\n]/.test(stringVal) || typeof val === 'object') {
          return `"${stringVal}"`;
        }
        return stringVal;
      }).join(',');
    });

    const csvContent = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Insert Modal Logic ---
  const handleOpenInsert = () => {
    if (!result) return;
    
    // Pre-fill fields based on existing columns, excluding ID
    const initialFields = result.columns
      .filter(c => c !== 'id')
      .map(c => ({ key: c, value: '', type: 'string' } as InsertField));
      
    // If no columns (e.g. empty collection view), start with one empty field
    if (initialFields.length === 0) {
        initialFields.push({ key: '', value: '', type: 'string' });
    }
    
    setInsertFields(initialFields);
    setShowInsertModal(true);
  };

  const handleInsertSubmit = () => {
    if (!onInsertRow) return;
    
    const data: Record<string, any> = {};
    
    for (const field of insertFields) {
        if (!field.key.trim()) continue; // Skip empty keys
        
        try {
            let val: any = field.value;
            switch(field.type) {
                case 'number': val = Number(field.value); break;
                case 'boolean': val = field.value.toLowerCase() === 'true'; break;
                case 'json': val = JSON.parse(field.value); break;
                case 'null': val = null; break;
                case 'string': default: val = String(field.value); break;
            }
            data[field.key] = val;
        } catch (e) {
            alert(`Error parsing field '${field.key}': Invalid ${field.type} format.`);
            return;
        }
    }
    
    onInsertRow(data);
    setShowInsertModal(false);
  };

  const updateInsertField = (idx: number, key: keyof InsertField, val: any) => {
    const newFields = [...insertFields];
    newFields[idx] = { ...newFields[idx], [key]: val };
    setInsertFields(newFields);
  };

  const addInsertField = () => {
    setInsertFields([...insertFields, { key: '', value: '', type: 'string' }]);
  };

  const removeInsertField = (idx: number) => {
      setInsertFields(insertFields.filter((_, i) => i !== idx));
  };

  if (loading && !result) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 gap-2 animate-pulse">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        Processing Query...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
        </div>
        <p>Ready to query Firestore</p>
      </div>
    );
  }

  if (result.type === 'error') {
    const isPermissionError = result.message?.toLowerCase().includes('missing or insufficient permissions') ||
      result.message?.toLowerCase().includes('permission-denied');

    return (
      <div className="flex-1 p-8 overflow-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-3xl mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full text-red-600 mt-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">Query Execution Failed</h3>
              <p className="text-red-700 font-mono text-sm mt-1">{result.message}</p>
            </div>
          </div>

          {isPermissionError && (
            <div className="mt-6 bg-white border border-red-100 rounded p-4">
              <h4 className="font-bold text-slate-800 mb-2">How to fix "Permission Denied"</h4>
              <p className="text-sm text-slate-600 mb-3">
                This error happens because your Firestore Security Rules are blocking unauthenticated access.
                Since this editor runs in the browser without Firebase Auth, you need to allow public access (Development Mode).
              </p>
              <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-slate-700">
                <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderEditWidget = () => {
    const isMultiLine = editValue.length > 50 || editValue.includes('\n') || editType === 'json';
    
    return (
      <div 
        ref={editContainerRef}
        className="absolute top-0 left-0 z-50 min-w-full min-h-full bg-white rounded shadow-xl border border-blue-500 flex flex-col"
        style={{ minWidth: '220px' }} // Ensure enough width for toolbar
      >
        {/* Type Selector Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border-b border-slate-200">
             <button 
                onClick={() => setEditType('string')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${editType === 'string' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                title="String"
             >Aa</button>
             <button 
                onClick={() => setEditType('number')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${editType === 'number' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                title="Number"
             >#</button>
             <button 
                onClick={() => setEditType('boolean')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${editType === 'boolean' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                title="Boolean"
             >T/F</button>
             <button 
                onClick={() => setEditType('json')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${editType === 'json' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                title="JSON Object/Array"
             >{'{}'}</button>
             <button 
                onClick={() => setEditType('null')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${editType === 'null' ? 'bg-slate-500 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                title="Null"
             >∅</button>
        </div>

        {/* Input Area */}
        <div className="flex-1 relative">
           {editType === 'null' ? (
              <div className="w-full h-full p-2 text-slate-400 italic text-sm bg-slate-50">
                null
              </div>
           ) : (
              isMultiLine ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full min-h-[60px] p-2 text-sm font-mono outline-none resize-y bg-white text-slate-900"
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full p-2 text-sm font-mono outline-none bg-white text-slate-900"
                />
              )
           )}
        </div>
      </div>
    );
  };

  const renderCell = (rowId: string, col: string, val: any) => {
    // Helper for Type Badge
    const getTypeBadge = () => {
        if (val === null) return <span className="ml-1.5 text-[9px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200 select-none shrink-0" title="Null">∅</span>;
        if (val === undefined) return <span className="ml-1.5 text-[9px] text-slate-400 bg-slate-100 px-1 rounded border border-slate-200 select-none shrink-0" title="Undefined">?</span>;
        const type = typeof val;
        if (type === 'boolean') return <span className="ml-1.5 text-[9px] text-purple-600 bg-purple-50 px-1 rounded border border-purple-100 font-mono select-none shrink-0" title="Boolean">T/F</span>;
        if (type === 'number') return <span className="ml-1.5 text-[9px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 font-mono select-none shrink-0" title="Number">#</span>;
        if (type === 'string') return <span className="ml-1.5 text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100 font-mono select-none shrink-0" title="String">Aa</span>;
        if (type === 'object') {
            if (Array.isArray(val)) return <span className="ml-1.5 text-[9px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-100 font-mono select-none shrink-0" title="Array">[]</span>;
            if (val && typeof val.seconds === 'number') return <span className="ml-1.5 text-[9px] text-pink-600 bg-pink-50 px-1 rounded border border-pink-100 font-mono select-none shrink-0" title="Timestamp">🕒</span>;
            return <span className="ml-1.5 text-[9px] text-orange-600 bg-orange-50 px-1 rounded border border-orange-100 font-mono select-none shrink-0" title="Object">{'{}'}</span>;
        }
        return null;
    };

    // Display Mode
    let content;
    if (val === null) content = <span className="text-slate-400 italic pointer-events-none">null</span>;
    else if (val === undefined) content = <span className="text-slate-400 italic pointer-events-none">undefined</span>;
    else if (typeof val === 'boolean') content = <span className={`pointer-events-none ${val ? 'text-green-600' : 'text-red-600'}`}>{val.toString()}</span>;
    else if (typeof val === 'object') {
      if (val && typeof val.seconds === 'number') {
        content = <span className="text-purple-600 pointer-events-none">{new Date(val.seconds * 1000).toLocaleString()}</span>
      } else {
        content = <span className="text-slate-600 font-mono text-xs cursor-help" title={JSON.stringify(val, null, 2)}>{JSON.stringify(val)}</span>;
      }
    } else {
        content = <span className="pointer-events-none">{String(val)}</span>;
    }

    return (
        <div className="flex items-center justify-between gap-2 h-full min-h-[1.5em]">
            <span className="truncate block" title={typeof val !== 'object' ? String(val) : undefined}>{content}</span>
            {getTypeBadge()}
        </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      <div className={`px-4 py-2 border-b text-sm font-medium flex items-center gap-2 ${result.type === 'write' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
        {result.type === 'write' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
        {result.message}
        
        {result.type === 'read' && (
          <div className="ml-auto flex items-center gap-3">
             <span className="text-xs text-slate-500 font-normal hidden sm:inline">Click cells to edit</span>
             
             {onInsertRow && result.collectionName && (
                <button onClick={handleOpenInsert} className="flex items-center gap-1 px-2 py-1 bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-sm">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Row
                </button>
             )}

             {result.rows.length > 0 && (
               <button onClick={handleExportCSV} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors shadow-sm">
                 <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Export CSV
               </button>
             )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse relative">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {result.columns.map((col) => (
                <th key={col} className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100 font-mono text-sm">
            {result.rows.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors group">
                {result.columns.map((col) => {
                  const isEditing = editingLoc?.id === row.id && editingLoc?.col === col;
                  const isId = col === 'id';
                  return (
                    <td 
                      key={`${idx}-${col}`} 
                      className={`p-3 border-r border-slate-100 last:border-r-0 whitespace-nowrap max-w-xs relative 
                        ${isId ? 'bg-slate-50 text-slate-500 cursor-default' : ''}
                        ${!isId && result.type === 'read' ? 'cursor-pointer hover:bg-blue-50' : ''}
                      `}
                      onClick={() => !isEditing && handleStartEdit(row.id, col, row[col])}
                    >
                      {isEditing ? renderEditWidget() : renderCell(row.id, col, row[col])}
                    </td>
                  );
                })}
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={result.columns.length} className="p-8 text-center text-slate-400 italic">
                  {page > 1 ? "End of results" : "No records found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {result.type === 'read' && (
        <div className="bg-slate-50 border-t border-slate-200 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
             {onPrevPage && (
               <button 
                  onClick={onPrevPage}
                  disabled={page <= 1 || loading}
                  className="text-xs font-medium px-3 py-1 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
               >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                   Prev
               </button>
             )}
             <span className="text-xs text-slate-500 font-medium bg-slate-200/50 px-2 py-1 rounded">
               Page {page}
             </span>
             {onNextPage && (
               <button 
                  onClick={onNextPage}
                  disabled={loading || result.rows.length === 0}
                  className="text-xs font-medium px-3 py-1 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
               >
                   Next
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
               </button>
             )}
             
             {loading && <span className="text-xs text-slate-400 ml-2 animate-pulse">Fetching...</span>}
          </div>
          
          <div className="flex items-center gap-2">
             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm transition-colors hover:bg-blue-100">
               <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               Showing: {result.rows.length}
             </span>
          </div>
        </div>
      )}

      {/* Insert Row Modal */}
      {showInsertModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90%] border border-slate-200">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Add Document to '{result.collectionName}'</h3>
                    <button onClick={() => setShowInsertModal(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto space-y-3 flex-1">
                    {insertFields.map((field, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    placeholder="Key" 
                                    value={field.key}
                                    onChange={(e) => updateInsertField(idx, 'key', e.target.value)}
                                    className="w-full p-2 text-xs font-mono border border-slate-300 rounded mb-1 focus:border-blue-500 outline-none"
                                />
                                <div className="flex gap-1">
                                    {['string', 'number', 'boolean', 'json', 'null'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => updateInsertField(idx, 'type', t)}
                                            className={`px-1.5 py-0.5 text-[10px] uppercase font-bold rounded border ${field.type === t ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                                        >
                                            {t === 'string' ? 'Aa' : t === 'boolean' ? 'T/F' : t === 'number' ? '#' : t === 'json' ? '{}' : '∅'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-[2]">
                                {field.type === 'null' ? (
                                    <div className="w-full p-2 text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded">null</div>
                                ) : (
                                    <textarea 
                                        placeholder="Value" 
                                        value={field.value}
                                        onChange={(e) => updateInsertField(idx, 'value', e.target.value)}
                                        className="w-full p-2 text-xs font-mono border border-slate-300 rounded h-[50px] focus:border-blue-500 outline-none resize-none"
                                    />
                                )}
                            </div>
                            <button onClick={() => removeInsertField(idx)} className="p-1 text-slate-400 hover:text-red-500 self-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                    <button onClick={addInsertField} className="w-full py-2 text-xs font-medium text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 transition-colors">
                        + Add Field
                    </button>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                    <button onClick={() => setShowInsertModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded">Cancel</button>
                    <button onClick={handleInsertSubmit} className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded hover:bg-blue-700 shadow-sm">Save Document</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;