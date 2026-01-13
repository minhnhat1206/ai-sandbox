import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: "Art in an Age of AI",
    content: "Artificial Intelligence will permeate every aspect of our lives. While machines handle automated tasks, the question remains: Can AI truly engage in the quintessential creative activity of producing and appreciating art? This analysis explores the friction between human agency and machine capability.",
    highlight: "INTRODUCTION"
  },
  {
    id: 2,
    title: "Agency & Intentionality",
    content: "We value art not just for its aesthetics, but for the human agency behind it—the choices, struggles, and intentions of the artist. We distinguish masterpieces from forgeries based on this 'intent', even if they look identical. Can AI have intent?",
    highlight: "THE HUMAN TOUCH"
  },
  {
    id: 3,
    title: "The 'Aura' of Authenticity",
    content: "Walter Benjamin argued that reproduction depreciates artwork's 'aura'—its unique presence in time and space. In the digital realm, perfect copies exist without an original. AI art, being natively digital, challenges the very notion of uniqueness and scarcity.",
    highlight: "BENJAMIN'S AURA"
  },
  {
    id: 4,
    title: "Understanding vs. Pattern Matching",
    content: "Current AI lacks common sense and sentience. It excels at recognizing patterns (identifying a 'dog' in pixels) but doesn't 'understand' the concept of a dog. If art communicates abstract ideas, can an entity without understanding truly produce it?",
    highlight: "THE CHINESE ROOM"
  },
  {
    id: 5,
    title: "Data-Driven Aesthetics",
    content: "Previous experiments like 'Komar & Melamid' crowd-sourced art preferences, resulting in banal, generic images. However, modern AI learns from billions of nuanced images. It can identify complex aesthetic patterns far beyond simple 'likes', potentially creating deeply evocative works.",
    highlight: "BEYOND THE AVERAGE"
  },
  {
    id: 6,
    title: "Generative 'Drafting'",
    content: "Tools like DALL-E and Midjourney allow for rapid visualization. An artist can generate 100 'drafts' in minutes, exploring styles from Renaissance to Surrealism. The machine handles the technical execution; the human provides the vision.",
    highlight: "ACCELERATED IDEATION"
  },
  {
    id: 7,
    title: "Divergent vs. Convergent",
    content: "Creativity involves Divergent thinking (generating possibilities) and Convergent thinking (selecting the best). AI is the ultimate Divergent thinker, offering endless variations. The human artist becomes the Convergent thinker—the curator who imbues meaning.",
    highlight: "THE NEW WORKFLOW"
  },
  {
    id: 8,
    title: "Ambiguity as a Feature",
    content: "Unlike autonomous vehicles which must avoid mistakes, art thrives on ambiguity. It forces viewers to ponder meaning. AI's occasional 'hallucinations' or artifacts can actually enhance the artistic experience by triggering the human imagination to find meaning where none was intended.",
    highlight: "THE POWER OF ERROR"
  },
  {
    id: 9,
    title: "The Artist as Curator",
    content: "The role of the artist is shifting. It is less about manual dexterity (holding the brush) and more about conceptual selection. The artist navigates the 'latent space' of the machine, choosing which outputs deserve to exist in the physical world.",
    highlight: "SHIFTING ROLES"
  },
  {
    id: 10,
    title: "Conclusion",
    content: "We don't know if AI will ever be sentient. But it doesn't need to be to change art. It is a powerful mirror reflecting our own aesthetics back at us. The ongoing development of aesthetically sensitive machines challenges our definitions of beauty and creativity.",
    highlight: "THE MIRROR"
  }
];

const PresentationDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="py-24 bg-white border-y border-gray-100 flex items-center justify-center min-h-[80vh]">
      <div className="max-w-6xl w-full px-4 md:px-8">
        <div className="flex flex-col md:flex-row gap-12 items-stretch">
          
          {/* Left Column: Controls & Progress */}
          <div className="md:w-1/3 flex flex-col justify-between">
            <div>
              <h2 className="text-5xl font-black tracking-tighter mb-2">THE<br/>ANALYSIS</h2>
              <p className="font-mono text-gray-500 text-sm">Based on Anjan Chatterjee's Framework</p>
            </div>
            
            <div className="hidden md:block">
              <div className="text-8xl font-black text-gray-100 tabular-nums">
                {String(currentSlide + 1).padStart(2, '0')}
              </div>
              <div className="w-full bg-gray-100 h-1 mt-4 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Right Column: Content Card */}
          <div className="md:w-2/3">
            <div className="bg-[#1A1A1A] text-white p-8 md:p-12 rounded-3xl min-h-[500px] flex flex-col justify-between relative overflow-hidden transition-all duration-500 shadow-2xl">
              
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

              <div>
                <span className="inline-block px-3 py-1 border border-white/20 rounded-full text-xs font-mono tracking-widest mb-6 text-blue-400">
                  {slides[currentSlide].highlight}
                </span>
                <h3 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                  {slides[currentSlide].title}
                </h3>
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-serif">
                  {slides[currentSlide].content}
                </p>
              </div>

              <div className="flex justify-between items-end mt-12 pt-8 border-t border-white/10">
                <Quote className="text-gray-600" size={48} />
                
                <div className="flex gap-4">
                  <button 
                    onClick={prevSlide}
                    className="p-4 rounded-full border border-white/20 hover:bg-white hover:text-black transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={nextSlide}
                    className="p-4 rounded-full bg-white text-black hover:bg-blue-600 hover:text-white transition-colors border border-white"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>

            </div>
            
            {/* Mobile Progress Indicator */}
            <div className="md:hidden mt-6 flex items-center gap-4">
               <span className="font-mono text-sm">{currentSlide + 1} / {slides.length}</span>
               <div className="flex-1 bg-gray-200 h-1 rounded-full">
                  <div 
                    className="bg-black h-full transition-all duration-300" 
                    style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                  ></div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default PresentationDeck;