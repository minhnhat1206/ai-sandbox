import React, { useState, useEffect, useRef } from 'react';

const steps = [
  {
    id: 1,
    text: "The Aura of Authenticity",
    description: "For centuries, art has been defined by the 'aura'—the unique existence of the work in time and space. We value the human hand, the struggle, and the intent behind every brushstroke.",
    imageState: "normal"
  },
  {
    id: 2,
    text: "Mechanical Reproduction",
    description: "When the camera arrived, critics feared the end of painting. Instead, it liberated art from realism. Now, we face a new machine—one that doesn't just capture reality, but synthesizes it.",
    imageState: "pixelated"
  },
  {
    id: 3,
    text: "The Digital Loss",
    description: "In the age of generative models, the image is infinite. Without the original, does the aura vanish? Or does it simply migrate to the prompt, the curation, and the concept?",
    imageState: "wireframe"
  }
];

const ScrollyTelling: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const observerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = steps.map((_, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveStep(index);
            }
          });
        },
        { threshold: 0.6 } // Trigger when 60% of the text block is visible
      );

      if (observerRefs.current[index]) {
        observer.observe(observerRefs.current[index]!);
      }
      return observer;
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  const getImageStyle = () => {
    const state = steps[activeStep].imageState;
    switch (state) {
      case 'pixelated':
        return 'contrast-125 brightness-110 saturate-150 grayscale-0 blur-none'; // CSS tricks to simulate harsh digital feel, simpler than canvas manipulation for this demo
      case 'wireframe':
        return 'grayscale opacity-60 invert'; 
      default:
        return 'grayscale-0';
    }
  };

  const getOverlay = () => {
      const state = steps[activeStep].imageState;
      if (state === 'pixelated') {
          return (
            <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h2v2H0zM2 2h2v2H2z' fill='%23000000' fill-opacity='0.2'/%3E%3C/svg%3E")`,
                backgroundSize: '8px 8px'
            }}></div>
          )
      }
      if (state === 'wireframe') {
          return (
             <div className="absolute inset-0 flex items-center justify-center z-10">
                 <div className="text-4xl font-mono text-blue-600 font-bold mix-blend-multiply opacity-50 tracking-widest border-4 border-blue-600 p-4 transform -rotate-12">
                     NO_SIGNAL
                 </div>
             </div>
          )
      }
      return null;
  }

  return (
    <section id="scrolly-section" className="relative w-full bg-white text-black">
      <div className="flex flex-col md:flex-row">
        
        {/* Sticky Image Column */}
        <div className="hidden md:flex w-1/2 h-screen sticky top-0 items-center justify-center bg-gray-50 overflow-hidden border-r border-gray-100">
           <div className={`relative w-4/5 h-4/5 transition-all duration-1000 ease-in-out transform ${activeStep === 2 ? 'scale-90' : 'scale-100'}`}>
                {/* Base Image */}
                <img 
                    src="https://picsum.photos/800/1000?grayscale" 
                    alt="Classical Art" 
                    className={`object-cover w-full h-full shadow-2xl transition-all duration-700 ${getImageStyle()}`}
                />
                {getOverlay()}
           </div>
        </div>

        {/* Scrolling Text Column */}
        <div className="w-full md:w-1/2">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              ref={(el) => { observerRefs.current[index] = el; }}
              className="h-screen flex flex-col justify-center px-8 md:px-20 max-w-xl mx-auto"
            >
              <span className="text-sm font-mono text-blue-600 mb-4 block">0{step.id} / 03</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{step.text}</h2>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                {step.description}
              </p>
              
              {/* Mobile Image Fallback (Visible only on small screens) */}
              <div className="md:hidden mt-8 w-full aspect-[4/5] bg-gray-100 relative overflow-hidden">
                 <img 
                    src="https://picsum.photos/800/1000" 
                    className={`object-cover w-full h-full ${index === 1 ? 'pixelated-fallback' : index === 2 ? 'grayscale invert' : ''}`}
                    alt="Mobile Art"
                 />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScrollyTelling;