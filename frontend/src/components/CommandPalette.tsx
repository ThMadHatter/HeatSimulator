import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Search, Command, MousePointer2, Hand, Ruler, Plus, Square, Zap, Download, Layout, RotateCcw } from 'lucide-react';

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const { setMode, setHeatmapViewMode, clearSelection } = useStore();

    const actions = [
        { id: 'select', label: 'Select Tool', icon: <MousePointer2 size={16} />, shortcut: 'V', action: () => setMode('select') },
        { id: 'pan', label: 'Pan Tool', icon: <Hand size={16} />, shortcut: 'H', action: () => setMode('pan') },
        { id: 'calibrate', label: 'Calibrate Scale', icon: <Ruler size={16} />, shortcut: 'C', action: () => setMode('calibrate') },
        { id: 'add-comp', label: 'Add Component', icon: <Plus size={16} />, shortcut: 'A', action: () => setMode('addComponent') },
        { id: 'draw-boundary', label: 'Draw PCB Boundary', icon: <Square size={16} />, shortcut: 'B', action: () => setMode('drawBoundary') },
        { id: 'draw-zone', label: 'Draw Conductivity Zone', icon: <Zap size={16} />, shortcut: 'Z', action: () => setMode('drawZone') },
        { id: 'view-top', label: 'View: Top Side', icon: <Layout size={16} />, action: () => setHeatmapViewMode('top') },
        { id: 'view-bottom', label: 'View: Bottom Side', icon: <Layout size={16} />, action: () => setHeatmapViewMode('bottom') },
        { id: 'view-max', label: 'View: Max Temperature', icon: <Layout size={16} />, action: () => setHeatmapViewMode('max') },
        { id: 'view-diff', label: 'View: Temperature Difference', icon: <Layout size={16} />, action: () => setHeatmapViewMode('difference') },
        { id: 'reset-layout', label: 'Reset UI Layout', icon: <RotateCcw size={16} />, action: () => {
            localStorage.clear();
            window.location.reload();
        }},
    ];

    const filteredActions = actions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleSelect = (index: number) => {
        filteredActions[index].action();
        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-[2px]">
            <div className="w-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center px-4 border-b border-gray-100 bg-gray-50">
                    <Search size={18} className="text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search actions and tools..."
                        className="flex-1 h-12 bg-transparent border-none outline-none px-3 text-sm text-gray-700"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedIndex(prev => (prev + 1) % filteredActions.length);
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
                            } else if (e.key === 'Enter') {
                                handleSelect(selectedIndex);
                            }
                        }}
                    />
                    <div className="flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px] text-gray-400 font-bold">
                        <Command size={10} /> K
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredActions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No actions found for "{query}"
                        </div>
                    ) : (
                        filteredActions.map((action, i) => (
                            <button
                                key={action.id}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                                    i === selectedIndex ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-gray-50 text-gray-700'
                                }`}
                                onClick={() => handleSelect(i)}
                                onMouseMove={() => setSelectedIndex(i)}
                            >
                                <span className={i === selectedIndex ? 'text-white' : 'text-gray-400'}>{action.icon}</span>
                                <span className="flex-1 text-sm font-medium">{action.label}</span>
                                {action.shortcut && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                        i === selectedIndex ? 'border-white/30 text-white' : 'border-gray-200 text-gray-400'
                                    }`}>
                                        {action.shortcut}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>

                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="border border-gray-200 bg-white px-1 rounded">↑↓</span> Move</span>
                        <span className="flex items-center gap-1"><span className="border border-gray-200 bg-white px-1 rounded">Enter</span> Select</span>
                    </div>
                    <span className="flex items-center gap-1"><span className="border border-gray-200 bg-white px-1 rounded">Esc</span> Close</span>
                </div>
            </div>
        </div>
    );
};
