import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from "@/feature/theme";

export const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch by waiting for mount
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const options = [
        { id: 'light', icon: Sun, label: 'LGT' },
        { id: 'system', icon: Monitor, label: 'AUTO' },
        { id: 'dark', icon: Moon, label: 'DRK' },
    ] as const;

    return (
        <div className="flex flex-col gap-2">
            {/* Label / Status Line (Optional, adds to the 'Console' feel) */}
            <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono text-muted uppercase tracking-widest">
          Display_Config
        </span>
                <div className="flex items-center gap-1.5">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${theme === 'system' ? 'bg-accent-blue animate-pulse' : 'bg-accent-cyan'}`} />
                    <span className="text-[10px] font-mono text-accent-cyan opacity-80">
            {theme.toUpperCase()}
          </span>
                </div>
            </div>

            {/* The Switcher Container */}
            <div
                className="relative inline-flex p-1 bg-neutral-950/80 border border-border rounded-lg backdrop-blur-sm shadow-lg overflow-hidden w-fit">

                {/* Grid Background Effect (Subtle texture) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                     style={{
                         backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                         backgroundSize: '10px 10px'
                     }}>
                </div>

                {/* The Sliding Active Background */}
                <div
                    className="absolute top-1 bottom-1 rounded transition-all duration-300 ease-out bg-surface border border-accent-cyan/30 shadow-[0_0_15px_-3px_var(--accent-cyan)]"
                    style={{
                        left: '4px',
                        width: 'calc(33.33% - 5px)',
                        transform: `translateX(${
                            options.findIndex((opt) => opt.id === theme) * 100
                        }%) translateX(${
                            options.findIndex((opt) => opt.id === theme) * 4 // Gap compensation
                        }px)`,
                    }}
                />

                {/* Buttons */}
                {options.map((option) => {
                    const isActive = theme === option.id;
                    const Icon = option.icon;

                    return (
                        <button
                            key={option.id}
                            onClick={() => setTheme(option.id)}
                            className={`
                  relative z-10 flex flex-col items-center justify-center 
                  w-16 h-12 gap-1 rounded cursor-pointer group outline-none
                  transition-all duration-300
                `}
                            aria-label={`Switch to ${option.id} theme`}
                        >
                            {/* Icon */}
                            <Icon
                                size={16}
                                className={`
                    transition-all duration-300
                    ${isActive ? 'text-accent-cyan scale-110' : 'text-muted group-hover:text-text'}
                  `}
                                strokeWidth={isActive ? 2.5 : 2}
                            />

                            {/* Tiny Label (Cyber Style) */}
                            <span className={`
                    text-[9px] font-mono font-bold tracking-wider transition-colors duration-300
                    ${isActive ? 'text-text' : 'text-muted/60 group-hover:text-muted'}
                `}>
                  {option.label}
                </span>

                            {/* Corner Accents (Only visible on active) */}
                            {isActive && (
                                <>
                                    <span
                                        className="absolute top-0.5 right-0.5 w-1 h-1 bg-accent-cyan/50 rounded-full" />
                                    <span
                                        className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-accent-cyan/50 rounded-full" />
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};