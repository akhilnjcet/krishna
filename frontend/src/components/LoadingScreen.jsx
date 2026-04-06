import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
    return (
        <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
            className="fixed inset-0 z-[100] bg-[#0F172A] flex flex-col items-center justify-center pointer-events-none"
        >
            <div className="relative">
                {/* Outermost rotating ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-32 h-32 rounded-full border-4 border-white/5 border-t-accent shadow-[0_0_50px_-12px_rgba(37,99,235,0.5)]"
                />
                
                {/* Inner counter-rotating ring */}
                <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full border-2 border-white/5 border-b-blue-400"
                />

                {/* Center Pulse */}
                <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div className="w-4 h-4 bg-accent rounded-full shadow-[0_0_20px_rgba(37,99,235,1)]" />
                </motion.div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 flex flex-col items-center gap-3"
            >
                <span className="text-white font-black tracking-[0.5em] uppercase text-[10px]">Initializing System</span>
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-1/2 h-full bg-gradient-to-r from-transparent via-accent to-transparent"
                    />
                </div>
            </motion.div>
        </motion.div>
    );
};

export default LoadingScreen;
