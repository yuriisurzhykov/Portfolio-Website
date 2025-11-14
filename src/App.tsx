import React, {useEffect, useState} from "react";

const BootScreen = () => {
    const [phase, setPhase] = useState('initial'); // initial, typing, complete, fadeout, hero
    const [displayedText, setDisplayedText] = useState(['', '', '']);
    const [currentLine, setCurrentLine] = useState(0);
    const [showCursor, setShowCursor] = useState(true);
    const [cursorBlinks, setCursorBlinks] = useState(0);
    const [showButton, setShowButton] = useState(false);

    const lines = [
        '> initializing FlowBus...',
        '> loading NavSymphony...',
        '> system ready.'
    ];

    // Initial glow fade-in
    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase('typing');
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    // Typewriter effect
    useEffect(() => {
        if (phase !== 'typing') return;
        if (currentLine >= lines.length) return;

        const currentText = displayedText[currentLine];
        const targetText = lines[currentLine];

        if (currentText.length < targetText.length) {
            const timer = setTimeout(() => {
                const newDisplayed = [...displayedText];
                newDisplayed[currentLine] = targetText.slice(0, currentText.length + 1);
                setDisplayedText(newDisplayed);
            }, 80);
            return () => clearTimeout(timer);
        } else {
            // Line complete - flash effect handled by CSS
            const timer = setTimeout(() => {
                if (currentLine < lines.length - 1) {
                    setCurrentLine(currentLine + 1);
                } else {
                    setPhase('complete');
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [phase, currentLine, displayedText]);

    // Cursor blinking after completion
    useEffect(() => {
        if (phase !== 'complete') return;

        const blinkInterval = setInterval(() => {
            setShowCursor(prev => !prev);
            setCursorBlinks(prev => prev + 1);
        }, 500);

        return () => clearInterval(blinkInterval);
    }, [phase]);

    // Show button after 2 cursor blinks
    useEffect(() => {
        if (cursorBlinks >= 4) {
            setShowButton(true);
        }
    }, [cursorBlinks]);

    const handleEnter = () => {
        setPhase('fadeout');
        setTimeout(() => {
            setPhase('hero');
        }, 700);
    };

    // Particle component
    const Particle: ({delay, duration, startX, startY, endX, endY}: {
        delay: any;
        duration: any;
        startX: any;
        startY: any;
        endX: any;
        endY: any
    }) => React.JSX.Element = ({ delay, duration, startX, startY, endX, endY }) => (
        <div
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-30"
            style={{
                left: `${startX}%`,
                top: `${startY}%`,
                animation: `float ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                '--end-x': `${endX}%`,
                '--end-y': `${endY}%`,
            }}
        />
    );

    if (phase === 'hero') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center animate-fade-in">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-cyan-400 mb-4">FlowBus</h1>
                    <p className="text-xl text-cyan-200">NavSymphony Online</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center">
            {/* Background glow */}
            <div
                className={`absolute inset-0 transition-opacity duration-700 ${
                    phase === 'fadeout' ? 'opacity-0' : phase === 'initial' ? 'opacity-0' : 'opacity-100'
                }`}
            >
                <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-cyan-950/20" />
            </div>

            {/* Particles */}
            {phase !== 'fadeout' && (
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <Particle
                            key={i}
                            delay={i * 0.5}
                            duration={15 + (i % 5) * 2}
                            startX={Math.random() * 100}
                            startY={Math.random() * 100}
                            endX={Math.random() * 100}
                            endY={Math.random() * 100}
                        />
                    ))}
                </div>
            )}

            {/* Terminal content */}
            <div
                className={`relative z-10 transition-opacity duration-700 ${
                    phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
                }`}
            >
                <div className="font-mono text-cyan-400 text-lg md:text-xl w-[80vw] max-w-2xl">
                    {displayedText.map((text, index) => (
                        <div
                            key={index}
                            className={`mb-2 ${
                                text.length === lines[index].length ? 'line-complete' : ''
                            }`}
                            style={{
                                textShadow: '0 0 8px rgba(0, 255, 242, 0.8)',
                            }}
                        >
                            {text}
                            {index === currentLine &&
                                phase === 'typing' &&
                                text.length < lines[index].length && (
                                    <span className="animate-pulse">█</span>
                                )}
                        </div>
                    ))}
                    {phase === 'complete' && showCursor && (
                        <span className="inline-block ml-1" style={{ textShadow: '0 0 8px rgba(0, 255, 242, 0.8)' }}>
              █
            </span>
                    )}
                </div>

                {/* Enter button */}
                {showButton && (
                    <div className="flex justify-center mt-12 animate-fade-in">
                        <button
                            onClick={handleEnter}
                            className="px-8 py-4 bg-cyan-500/10 border-2 border-cyan-400 rounded-lg text-cyan-400 font-mono text-lg backdrop-blur-sm transition-all duration-300 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-400/50 hover:scale-105 active:scale-95"
                            style={{
                                animation: 'pulse-glow 2s ease-in-out infinite',
                            }}
                        >
                            ENTER SYSTEM
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

        * {
          font-family: 'JetBrains Mono', monospace;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(20px, -30px);
          }
          50% {
            transform: translate(-15px, -60px);
          }
          75% {
            transform: translate(25px, -40px);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.7s ease-out;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 255, 242, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 255, 242, 0.6);
          }
        }

        .line-complete {
          animation: flash 0.2s ease-out;
        }

        @keyframes flash {
          0% {
            text-shadow: 0 0 8px rgba(0, 255, 242, 0.8);
          }
          50% {
            text-shadow: 0 0 20px rgba(0, 255, 242, 1), 0 0 30px rgba(0, 255, 242, 0.8);
          }
          100% {
            text-shadow: 0 0 8px rgba(0, 255, 242, 0.8);
          }
        }
      `}</style>
        </div>
    );
};

export default BootScreen;