'use client';

import { useInView } from 'react-intersection-observer';
import { ReactNode } from 'react';

interface ScrollAnimateProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-in' | 'fade-up' | 'slide-in-left' | 'slide-in-right' | 'scale-in';
  delay?: number;
}

export default function ScrollAnimate({ 
  children, 
  className = '', 
  animation = 'fade-in',
  delay = 0 
}: ScrollAnimateProps) {
  const { ref, inView } = useInView({
    threshold: 0.01,
    triggerOnce: false,
  });

  const animationClasses = {
    'fade-in': 'animate-fade-in',
    'fade-up': 'animate-fade-up',
    'slide-in-left': 'animate-slide-in',
    'slide-in-right': 'animate-slide-in-right',
    'scale-in': 'animate-scale-in',
  };

  return (
    <div
      ref={ref}
      className={`${className} ${inView ? animationClasses[animation] : ''}`}
      style={{ animationDelay: `${delay}ms`, visibility: 'visible' }}
    >
      {children}
    </div>
  );
}
