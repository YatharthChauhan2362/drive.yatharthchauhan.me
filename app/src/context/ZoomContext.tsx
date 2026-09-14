import React, { createContext, useContext, useState, useEffect } from 'react';

interface ZoomContextType {
    zoom: number;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export const useZoom = () => {
    const context = useContext(ZoomContext);
    if (!context) {
        throw new Error('useZoom must be used within a ZoomProvider');
    }
    return context;
};

export const ZoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [zoom, setZoom] = useState(() => {
        const saved = localStorage.getItem('ui-zoom');
        return saved ? parseFloat(saved) : 1.0;
    });

    useEffect(() => {
        document.documentElement.style.setProperty('--ui-zoom', zoom.toString());
        localStorage.setItem('ui-zoom', zoom.toString());
        
        // Scale the base font size to affect all rem-based units
        // Standard is 16px, so we multiply by zoom
        document.documentElement.style.fontSize = `${16 * zoom}px`;
    }, [zoom]);

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.7));
    const resetZoom = () => setZoom(1.0);

    return (
        <ZoomContext.Provider value={{ zoom, zoomIn, zoomOut, resetZoom }}>
            {children}
        </ZoomContext.Provider>
    );
};
