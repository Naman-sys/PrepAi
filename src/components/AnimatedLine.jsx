import React from 'react'

export default function AnimatedLine() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" style={{ backgroundColor: '#0d0d0d' }}>
      <style>
        {`
          @keyframes riseGrid {
            0% { transform: translateY(0); }
            100% { transform: translateY(-32px); }
          }
          .animate-grid-rise {
            animation: riseGrid 6s linear infinite;
          }
        `}
      </style>
      {/* The moving dot grid */}
      <div 
        className="absolute -inset-[100%] w-[300%] h-[300%] animate-grid-rise opacity-90" 
        style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.62) 1.8px, transparent 1.8px)', backgroundSize: '30px 30px' }}
      ></div>
      
      {/* Fading mask so it blends out at the edges */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(13,13,13,0.2) 0%, #0d0d0d 82%)' }}></div>
    </div>
  )
}
