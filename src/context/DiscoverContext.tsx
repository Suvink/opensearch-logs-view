import React, { createContext, useContext, useReducer, useCallback } from 'react';

export const PAGE_SIZE = 100;

interface DiscoverState {
  searchTerm: string;
  selectedColumns: string[];
  expandedRowIds: Set<string>;
  sidebarCollapsed: boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  timeFrom: string | null; // ISO string, null = no lower bound
  timeTo: string | null;   // ISO string, null = no upper bound
}

type DiscoverAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'ADD_COLUMN'; payload: string }
  | { type: 'REMOVE_COLUMN'; payload: string }
  | { type: 'TOGGLE_ROW'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SORT'; payload: { field: string; direction: 'asc' | 'desc' } }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_TIME_FILTER'; payload: { from: string | null; to: string | null } }
  | { type: 'RESET_FOR_FILE'; payload: string[] };

const DEFAULT_COLUMNS = ['@timestamp', 'log'];

function discoverReducer(state: DiscoverState, action: DiscoverAction): DiscoverState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload, expandedRowIds: new Set(), currentPage: 1 };
    case 'ADD_COLUMN':
      if (state.selectedColumns.includes(action.payload)) return state;
      return { ...state, selectedColumns: [...state.selectedColumns, action.payload] };
    case 'REMOVE_COLUMN':
      return { ...state, selectedColumns: state.selectedColumns.filter(c => c !== action.payload) };
    case 'TOGGLE_ROW': {
      const next = new Set<string>(state.expandedRowIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, expandedRowIds: next };
    }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_SORT':
      return { ...state, sortField: action.payload.field, sortDirection: action.payload.direction, currentPage: 1 };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload, expandedRowIds: new Set() };
    case 'SET_TIME_FILTER':
      return { ...state, timeFrom: action.payload.from, timeTo: action.payload.to, currentPage: 1, expandedRowIds: new Set() };
    case 'RESET_FOR_FILE': {
      const cols = DEFAULT_COLUMNS.filter(c => action.payload.includes(c));
      return {
        ...state,
        searchTerm: '',
        selectedColumns: cols.length > 0 ? cols : action.payload.slice(0, 2),
        expandedRowIds: new Set(),
        sortField: '@timestamp',
        sortDirection: 'desc',
        currentPage: 1,
        timeFrom: null,
        timeTo: null,
      };
    }
    default:
      return state;
  }
}

interface DiscoverContextValue extends DiscoverState {
  setSearch: (term: string) => void;
  addColumn: (field: string) => void;
  removeColumn: (field: string) => void;
  toggleRow: (id: string) => void;
  toggleSidebar: () => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setTimeFilter: (from: string | null, to: string | null) => void;
  resetForFile: (fields: string[]) => void;
}

const DiscoverContext = createContext<DiscoverContextValue | null>(null);

export function DiscoverProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(discoverReducer, {
    searchTerm: '',
    selectedColumns: DEFAULT_COLUMNS,
    expandedRowIds: new Set<string>(),
    sidebarCollapsed: false,
    sortField: '@timestamp',
    sortDirection: 'desc',
    currentPage: 1,
    timeFrom: null,
    timeTo: null,
  });

  const setSearch = useCallback((term: string) => dispatch({ type: 'SET_SEARCH', payload: term }), []);
  const addColumn = useCallback((field: string) => dispatch({ type: 'ADD_COLUMN', payload: field }), []);
  const removeColumn = useCallback((field: string) => dispatch({ type: 'REMOVE_COLUMN', payload: field }), []);
  const toggleRow = useCallback((id: string) => dispatch({ type: 'TOGGLE_ROW', payload: id }), []);
  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);
  const setSort = useCallback((field: string, direction: 'asc' | 'desc') =>
    dispatch({ type: 'SET_SORT', payload: { field, direction } }), []);
  const setPage = useCallback((page: number) => dispatch({ type: 'SET_PAGE', payload: page }), []);
  const setTimeFilter = useCallback((from: string | null, to: string | null) =>
    dispatch({ type: 'SET_TIME_FILTER', payload: { from, to } }), []);
  const resetForFile = useCallback((fields: string[]) =>
    dispatch({ type: 'RESET_FOR_FILE', payload: fields }), []);

  return (
    <DiscoverContext.Provider value={{
      ...state,
      setSearch, addColumn, removeColumn, toggleRow, toggleSidebar, setSort, setPage, setTimeFilter, resetForFile,
    }}>
      {children}
    </DiscoverContext.Provider>
  );
}

export function useDiscover() {
  const ctx = useContext(DiscoverContext);
  if (!ctx) throw new Error('useDiscover must be used within DiscoverProvider');
  return ctx;
}
