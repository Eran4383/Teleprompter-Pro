import React from 'react';

interface ControlSliderProps {
    label?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
    formatValue?: (val: number) => string;
}

export const ControlSlider: React.FC<ControlSliderProps> = ({ 
    label, value, min, max, step = 1, onChange, formatValue 
}) => {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <span>{label}</span>
                    <span>{formatValue ? formatValue(value) : value}</span>
                </div>
            )}
            <input 
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
};