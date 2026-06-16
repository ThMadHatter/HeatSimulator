import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoIconProps {
    title: string;
    text: string;
}

export const InfoIcon: React.FC<InfoIconProps> = ({ title, text }) => {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-block ml-1">
            <button
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onFocus={() => setShow(true)}
                onBlur={() => setShow(false)}
                className="text-gray-400 hover:text-blue-500 transition-colors focus:outline-none"
                aria-label={`Info about ${title}`}
            >
                <Info size={12} />
            </button>
            {show && (
                <div className="absolute z-[100] left-full ml-2 top-0 -translate-y-1/4 w-48 bg-gray-900 text-white text-[10px] p-2 rounded shadow-xl border border-white/10 backdrop-blur-sm">
                    <div className="font-bold border-b border-white/20 mb-1 pb-1 uppercase">{title}</div>
                    <div className="leading-relaxed opacity-90">{text}</div>
                </div>
            )}
        </div>
    );
};
