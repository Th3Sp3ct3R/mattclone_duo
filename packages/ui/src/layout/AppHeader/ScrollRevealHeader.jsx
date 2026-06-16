 'use client';
 
 import { useEffect, useState } from 'react';
 
 import { cx } from '../../primitives/_utils/cx.js';
 
 export function ScrollRevealHeader({
   className = '',
   children,
   threshold = 24,
   ...props
 }) {
   const [isVisible, setIsVisible] = useState(false);
 
   useEffect(() => {
     let rafId = null;
 
     const updateVisibility = () => {
       setIsVisible(window.scrollY > threshold);
     };
 
     const handleScroll = () => {
       if (rafId) {
         return;
       }
 
       rafId = window.requestAnimationFrame(() => {
         rafId = null;
         updateVisibility();
       });
     };
 
     updateVisibility();
     window.addEventListener('scroll', handleScroll, { passive: true });
 
     return () => {
       if (rafId) {
         window.cancelAnimationFrame(rafId);
       }
       window.removeEventListener('scroll', handleScroll);
     };
   }, [threshold]);
 
   return (
     <header
       className={cx('c-ScrollRevealHeader', isVisible && 'is-visible', className)}
       {...props}
     >
       {children}
     </header>
   );
 }
