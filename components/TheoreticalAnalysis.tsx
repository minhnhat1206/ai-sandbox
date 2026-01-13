import React, { useState } from 'react';
import { Eye, AlertTriangle, GitBranch, Layers, Plus, Minus } from 'lucide-react';

const theories = [
  {
    id: 'neuro',
    title: "THE NEUROAESTHETIC RESPONSE",
    subtitle: "Kirk et al., 2009",
    icon: <Eye size={32} />,
    summary: "Our brains physically react differently to art depending on its attributed origin.",
    fullText: "In empirical studies, participants showed greater neural activity in reward areas of the brain when they believed an image came from a gallery rather than a computer—even when the images were identical. This suggests that 'pleasure' in art is deeply tied to our perception of human agency and intentionality, not just visual patterns."
  },
  {
    id: 'bias',
    title: "THE BIAS REIFICATION",
    subtitle: "Taylor, 2022",
    icon: <AlertTriangle size={32} />,
    summary: "AI does not just mirror our reality; it calcifies our prejudices.",
    fullText: "A significant danger of deep learning is that biases embedded in training data sets are not just reproduced but 'reified' (made concrete). Generative models trained on historical art history may perpetuate Eurocentric, male-dominated views of 'masterpieces,' creating a feedback loop that marginalizes under-represented aesthetics and demographics."
  },
  {
    id: 'ambiguity',
    title: "THE AMBIGUITY PARADOX",
    subtitle: "Hockney, 2001 vs. Autonomous Systems",
    icon: <GitBranch size={32} />,
    summary: "Machines seek precision. Art demands the exact opposite.",
    fullText: "Autonomous vehicles must avoid mistakes to survive. Art, however, creates 'power' through intentional ambiguity, forcing the viewer to bridge gaps in meaning. An AI optimized for an 'objective function' (the correct answer) struggles with the poetic necessity of being 'wrong' or 'open-ended' in a way that resonates emotionally."
  },
  {
    id: 'layers',
    title: "THE ALIEN INTELLIGENCE",
    subtitle: "Deep Blue & AlphaGo",
    icon: <Layers size={32} />,
    summary: "Sentience is not required for superior output, creating a disconnect in appreciation.",
    fullText: "When Kasparov lost to Deep Blue, he felt an 'alien intelligence.' AI solves problems (like protein folding or composition) using multidimensional equations impossible for humans to grasp. This creates a form of 'Post-Human Art' where the result is aesthetically pleasing, but the process is devoid of human-relatable struggle or emotion."
  }
];

const TheoreticalAnalysis: React.FC = () => {
  const [activeTheory, setActiveTheory] = useState<string | null>(null);

  const toggleTheory = (id: string) => {
    setActiveTheory(activeTheory === id ? null : id);
  };

  return (
    <section className="py-24 bg-white text-black relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2 rotate-12 bg-[repeating-linear-gradient(45deg,black,black_1px,transparent_1px,transparent_20px)]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="mb-20 border-b-4 border-black pb-8">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
            CRITICAL<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-black">PERSPECTIVES</span>
          </h2>
          <div className="flex flex-col md:flex-row justify-between items-end">
            <p className="text-xl font-serif max-w-xl italic">
              "It would be premature to relegate AI to a minor role, yet dangerous to assume it possesses agency."
            </p>
            <span className="font-mono text-sm tracking-widest mt-4 md:mt-0 uppercase bg-black text-white px-2 py-1">
              Ref: Frontiers in Psychology, 2022
            </span>
          </div>
        </div>

        {/* Interactive Theory Grid */}
        <div className="grid grid-cols-1 gap-0 border-t-2 border-black">
          {theories.map((item, index) => (
            <div 
              key={item.id} 
              className={`group border-b-2 border-black transition-all duration-500 ease-in-out ${activeTheory === item.id ? 'bg-black text-white py-12' : 'bg-white hover:bg-gray-50 py-8'}`}
            >
              <div 
                className="cursor-pointer px-4 md:px-8 flex flex-col md:flex-row gap-8 md:items-start"
                onClick={() => toggleTheory(item.id)}
              >
                {/* Index Number */}
                <span className={`font-mono text-xl md:text-4xl font-bold opacity-30 ${activeTheory === item.id ? 'text-white' : 'text-black'}`}>
                  0{index + 1}
                </span>

                {/* Main Content Area */}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl md:text-5xl font-black uppercase tracking-tight leading-none">
                      {item.title}
                    </h3>
                    <div className={`transition-transform duration-300 ${activeTheory === item.id ? 'rotate-180' : ''}`}>
                      {activeTheory === item.id ? <Minus size={32} /> : <Plus size={32} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    {item.icon}
                    <span className={`font-mono text-xs uppercase tracking-widest ${activeTheory === item.id ? 'text-blue-400' : 'text-blue-700'}`}>
                      {item.subtitle}
                    </span>
                  </div>

                  <p className={`text-lg md:text-xl font-medium leading-relaxed max-w-3xl transition-all duration-300 ${activeTheory === item.id ? 'opacity-100 mb-8' : 'opacity-60'}`}>
                    {item.summary}
                  </p>

                  {/* Expanded Content */}
                  <div 
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${activeTheory === item.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="pt-8 border-t border-white/20 grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="col-span-2 text-lg md:text-xl font-serif leading-loose text-gray-300">
                        {item.fullText}
                      </div>
                      
                      {/* Visualization Placeholder Box */}
                      <div className="col-span-1 flex items-center justify-center">
                         <div className="w-full h-40 bg-neutral-800 flex items-center justify-center text-center p-4 border border-neutral-700 shadow-inner rounded-sm">
                            <span className="font-mono text-xs text-gray-400 tracking-widest">
                                [ THEORY_VISUALIZATION_<br/>{item.id.toUpperCase()} ]
                            </span>
                         </div>
                      </div>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 flex justify-end">
            <div className="text-right">
                <p className="font-bold uppercase tracking-widest text-xs mb-1">Author's Conclusion</p>
                <p className="text-gray-500 max-w-md text-sm">
                    "AI is and will increasingly be a powerful tool for artists. The continuing development of aesthetically sensitive machines will challenge our notions of beauty, creativity, and the nature of art."
                </p>
            </div>
        </div>

      </div>
    </section>
  );
};

export default TheoreticalAnalysis;