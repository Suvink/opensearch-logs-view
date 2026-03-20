import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { FileRecord } from '../types/opensearch';
import { lsGet, lsSet, FILES_KEY, isNearQuota } from '../utils/localStorageUtils';

interface FileState {
  files: FileRecord[];
  selectedFileId: string | null;
  storageWarning: string | null;
}

type FileAction =
  | { type: 'INIT'; payload: FileRecord[] }
  | { type: 'ADD_FILE'; payload: FileRecord }
  | { type: 'DELETE_FILE'; payload: string }
  | { type: 'SELECT_FILE'; payload: string | null }
  | { type: 'SET_WARNING'; payload: string | null };

function fileReducer(state: FileState, action: FileAction): FileState {
  switch (action.type) {
    case 'INIT':
      return { ...state, files: action.payload };
    case 'ADD_FILE':
      return { ...state, files: [...state.files, action.payload] };
    case 'DELETE_FILE': {
      const files = state.files.filter(f => f.id !== action.payload);
      const selectedFileId = state.selectedFileId === action.payload ? null : state.selectedFileId;
      return { ...state, files, selectedFileId };
    }
    case 'SELECT_FILE':
      return { ...state, selectedFileId: action.payload };
    case 'SET_WARNING':
      return { ...state, storageWarning: action.payload };
    default:
      return state;
  }
}

interface FileContextValue extends FileState {
  addFile: (record: FileRecord) => { ok: boolean; error?: string };
  deleteFile: (id: string) => void;
  selectFile: (id: string | null) => void;
  selectedFile: FileRecord | null;
  clearWarning: () => void;
}

const FileContext = createContext<FileContextValue | null>(null);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(fileReducer, {
    files: [],
    selectedFileId: null,
    storageWarning: null,
  });

  useEffect(() => {
    const saved = lsGet<FileRecord[]>(FILES_KEY);
    if (saved) dispatch({ type: 'INIT', payload: saved });
  }, []);

  useEffect(() => {
    if (state.files.length > 0) {
      const result = lsSet(FILES_KEY, state.files);
      if (!result.ok) {
        dispatch({ type: 'SET_WARNING', payload: result.error });
      }
    }
  }, [state.files]);

  const addFile = useCallback((record: FileRecord) => {
    const testFiles = [...state.files, record];
    const result = lsSet(FILES_KEY, testFiles);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    dispatch({ type: 'ADD_FILE', payload: record });
    if (isNearQuota()) {
      dispatch({ type: 'SET_WARNING', payload: 'Storage usage is near the 5MB limit. Consider deleting old files.' });
    }
    return { ok: true };
  }, [state.files]);

  const deleteFile = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FILE', payload: id });
    // Also clean up in localStorage after state update
    setTimeout(() => {
      const updated = state.files.filter(f => f.id !== id);
      lsSet(FILES_KEY, updated);
    }, 0);
  }, [state.files]);

  const selectFile = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_FILE', payload: id });
  }, []);

  const clearWarning = useCallback(() => {
    dispatch({ type: 'SET_WARNING', payload: null });
  }, []);

  const selectedFile = state.files.find(f => f.id === state.selectedFileId) ?? null;

  return (
    <FileContext.Provider value={{ ...state, addFile, deleteFile, selectFile, selectedFile, clearWarning }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const ctx = useContext(FileContext);
  if (!ctx) throw new Error('useFiles must be used within FileProvider');
  return ctx;
}
