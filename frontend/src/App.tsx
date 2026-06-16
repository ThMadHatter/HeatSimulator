import React from 'react';
import Toolbar from './components/Toolbar';
import CanvasView from './components/CanvasView';
import PropertyPanel from './components/PropertyPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { FloatingPanels } from './components/FloatingPanels';

function App() {
    return (
        <div id="App" className="h-screen flex flex-col bg-slate-50 overflow-hidden text-slate-900">
            <CommandPalette />
            <div className="flex flex-1 overflow-hidden relative">
                <Toolbar />
                <main className="flex-1 relative overflow-hidden">
                    <ErrorBoundary>
                        <CanvasView />
                    </ErrorBoundary>
                    <FloatingPanels />
                </main>
                <PropertyPanel />
            </div>
            <StatusBar />
        </div>
    )
}

export default App
