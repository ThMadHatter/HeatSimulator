import React from 'react';
import { useStore } from '../store/useStore';
import { DraggableCard } from './DraggableCard';
import { GettingStarted } from './GettingStarted';
import { LayerManager } from './LayerManager';
import { Info, Thermometer, Palette, Settings, Layers, Bug } from 'lucide-react';

export const FloatingPanels: React.FC = () => {
    return (
        <>
            <DraggableCard id="getting-started" title="Getting Started" initialPosition={{ x: 80, y: 20 }}>
                <GettingStarted />
            </DraggableCard>

            <DraggableCard id="layers" title="Layer Manager" initialPosition={{ x: 80, y: 300 }}>
                <LayerManager />
            </DraggableCard>
        </>
    );
};
