import React from 'react';
import { ChevronDown } from 'lucide-react';

const Hero: React.FC = () => {
  const scrollToNext = () => {
    const nextSection = document.getElementById('scrolly-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="h-screen w-full flex flex-col items-center justify-center relative bg-white overflow-hidden">
      <div className="text-center z-10 flex flex-col items-center justify-center">
        <h1 className="text-[15vw] leading-[0.8] font-black tracking-tighter select-none">
          <span className="outline-text block hover:text-black transition-colors duration-500 cursor-default">ART</span>
          <span className="block text-[#1A1A1A] glitch-hover cursor-pointer relative">
            IN THE AGE OF
          </span>
          <span className="block text-[#1A1A1A] glitch-hover cursor-pointer">
            AI
          </span>
        </h1>
        <p className="mt-8 text-sm md:text-base font-mono uppercase tracking-widest text-gray-500">
          Agency vs. Automation
        </p>
      </div>

      <button 
        onClick={scrollToNext}
        className="absolute bottom-10 animate-bounce p-4 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Scroll to explore"
      >
        <ChevronDown size={32} strokeWidth={1} />
      </button>

      {/* Abstract Background Elements */}
      <div className="absolute top-10 left-10 w-24 h-24 border border-gray-200 rounded-full opacity-50"></div>
      <div className="absolute bottom-20 right-20 w-64 h-64 border border-gray-100 rounded-full opacity-30"></div>
    </section>
  );
};

export default Hero;