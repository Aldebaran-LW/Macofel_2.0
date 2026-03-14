'use client';

import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';
import { ReactNode, useRef, useEffect, useState, useMemo } from 'react';

interface InfiniteCarouselProps {
  children: ReactNode[] | ReactNode;
  speed?: number; // pixels per second
  direction?: 'left' | 'right';
  gap?: number;
  className?: string;
}

export default function InfiniteCarousel({
  children,
  speed = 65,
  direction = 'left',
  gap = 24,
  className = '',
}: InfiniteCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [loopWidth, setLoopWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  
  // Normalizar children para array
  const childrenArray = Array.isArray(children) ? children : [children];
  const duplicatedChildren = useMemo(() => [...childrenArray, ...childrenArray], [childrenArray]);

  useEffect(() => {
    if (!trackRef.current || typeof ResizeObserver === 'undefined') return;

    const updateLoopWidth = () => {
      const width = trackRef.current?.scrollWidth ?? 0;
      setLoopWidth(width / 2);
      x.set(0);
    };

    updateLoopWidth();

    const resizeObserver = new ResizeObserver(() => updateLoopWidth());
    resizeObserver.observe(trackRef.current);
    window.addEventListener('resize', updateLoopWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLoopWidth);
    };
  }, [childrenArray, x]);

  useAnimationFrame((_, delta) => {
    if (prefersReducedMotion || paused) return;
    
    // Aguardar até que loopWidth seja calculado
    if (loopWidth === 0) {
      const width = trackRef.current?.scrollWidth ?? 0;
      if (width > 0) {
        setLoopWidth(width / 2);
        return;
      }
      return;
    }

    const distance = (speed * delta) / 1000;
    const next = direction === 'left' ? x.get() - distance : x.get() + distance;
    
    if (direction === 'left') {
      x.set(next <= -loopWidth ? next + loopWidth : next);
    } else {
      x.set(next >= loopWidth ? next - loopWidth : next);
    }
  });

  if (!childrenArray || childrenArray.length === 0) {
    return null;
  }

  return (
    <div
      className={`overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ width: '100%', position: 'relative', minHeight: '400px' }}
    >
      <motion.div 
        ref={trackRef} 
        style={{ 
          x, 
          gap: `${gap}px`, 
          display: 'flex',
          width: 'max-content'
        }} 
        className="flex w-max py-2"
      >
        {duplicatedChildren.map((child, index) => (
          <div 
            key={`carousel-item-${index}`} 
            style={{ 
              flexShrink: 0, 
              display: 'block', 
              visibility: 'visible',
              opacity: 1,
              position: 'relative'
            }}
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
