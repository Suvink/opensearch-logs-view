import { useState } from 'react';
import './styles/global.css';
import { FileProvider, useFiles } from './context/FileContext';
import { DiscoverProvider } from './context/DiscoverContext';
import GlobalHeader from './components/GlobalHeader/GlobalHeader';
import FileManagerPanel from './components/FileManager/FileManagerPanel';
import DiscoverView from './components/Discover/DiscoverView';
import EmptyState from './components/EmptyState/EmptyState';

function AppContent() {
  const [panelOpen, setPanelOpen] = useState(false);
  const { selectedFile } = useFiles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <GlobalHeader panelOpen={panelOpen} onTogglePanel={() => setPanelOpen(p => !p)} />
      <FileManagerPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      {selectedFile ? (
        <DiscoverView file={selectedFile} />
      ) : (
        <EmptyState onOpenFileManager={() => setPanelOpen(true)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <FileProvider>
      <DiscoverProvider>
        <AppContent />
      </DiscoverProvider>
    </FileProvider>
  );
}
