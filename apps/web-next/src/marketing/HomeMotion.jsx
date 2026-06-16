 'use client';
 
 import { motion } from 'framer-motion';
 
 const easing = [0.22, 1, 0.36, 1];
 
 const fadeUp = {
   hidden: { opacity: 0, y: 24 },
   show: {
     opacity: 1,
     y: 0,
     transition: { duration: 0.85, ease: easing }
   }
 };
 
 const stagger = (delayChildren = 0) => ({
   hidden: {},
   show: {
     transition: {
       staggerChildren: 0.14,
       delayChildren
     }
   }
 });
 
 export function MotionSection({ children, className = '', delay = 0 }) {
   return (
     <motion.div
       className={className}
       variants={fadeUp}
       initial="hidden"
       whileInView="show"
       viewport={{ once: true, amount: 0.2 }}
       transition={{ duration: 0.85, ease: easing, delay }}
     >
       {children}
     </motion.div>
   );
 }
 
 export function MotionStagger({ children, className = '', delay = 0 }) {
   return (
     <motion.div
       className={className}
       variants={stagger(delay)}
       initial="hidden"
       whileInView="show"
       viewport={{ once: true, amount: 0.2 }}
     >
       {children}
     </motion.div>
   );
 }
 
 export function MotionItem({ children, className = '' }) {
   return (
     <motion.div className={className} variants={fadeUp}>
       {children}
     </motion.div>
   );
 }
