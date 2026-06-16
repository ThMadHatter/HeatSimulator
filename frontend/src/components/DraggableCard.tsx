import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Minimize2, Maximize2, X } from 'lucide-react';

interface DraggableCardProps {
    id: string;
    title: string;
    children: React.ReactNode;
    initialPosition?: { x: number, y: number };
    onClose?: () => void;
    onPositionChange?: (pos: { x: number, y: number }) => void;
}

export const DraggableCard: React.FC<DraggableCardProps> = ({ id, title, children, initialPosition = { x: 20, y: 20 }, onClose, onPositionChange }) => {
    const [pos, setPos] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem(`card-pos-${id}`);
        if (saved) {
            setPos(JSON.parse(saved));
        }
    }, [id]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            dragStartPos.current = {
                x: e.clientX - pos.x,
                y: e.clientY - pos.y
            };
            e.preventDefault();
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newPos = {
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y
            };
            setPos(newPos);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                localStorage.setItem(`card-pos-${id}`, JSON.stringify(pos));
                if (onPositionChange) onPositionChange(pos);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, pos, id, onPositionChange]);

    return (
        <div
            ref={cardRef}
            className={`fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col transition-shadow ${isDragging ? 'shadow-blue-200 ring-2 ring-blue-400' : ''}`}
            style={{
                left: pos.x,
                top: pos.y,
                width: '300px',
                maxHeight: '80vh',
            }}
        >
            <div
                className="drag-handle flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing rounded-t-xl"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <GripHorizontal size={14} className="text-gray-400 shrink-0" />
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider truncate">{title}</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                        {isCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-gray-500">
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>
            {!isCollapsed && (
                <div className="overflow-y-auto p-1 flex-1 custom-scrollbar">
                    {children}
                </div>
            )}
        </div>
    );
};
