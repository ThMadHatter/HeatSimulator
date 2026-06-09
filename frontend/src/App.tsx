import React from 'react';
import Toolbar from './components/Toolbar';
import CanvasView from './components/CanvasView';
import PropertyPanel from './components/PropertyPanel';
import ErrorBoundary from './components/ErrorBoundary';
import Controls from './components/Controls';

function App() {
    return (
        <div id="App" className="h-screen flex flex-col bg-gray-100 overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                <Toolbar />
                <ErrorBoundary>
                    <CanvasView />
                </ErrorBoundary>
                <PropertyPanel />
            </div>
            <Controls />
        </div>
    )
}

export default App
