import React, { useState } from 'react';
import { generateAIArt } from '../services/geminiService';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';

const FutureGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await generateAIArt(prompt);
      if (result) {
        setGeneratedImage(result);
      } else {
        setError('The machine remained silent. Try again.');
      }
    } catch (err) {
      setError('Connection to the neural link failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-24 px-4 bg-white relative overflow-hidden">
      {/* Decorative Anti-Design Elements */}
      <div className="absolute top-20 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>
      <div className="absolute bottom-20 left-20 w-72 h-4 bg-black transform -rotate-12 -z-10"></div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Text Column - Slightly misaligned */}
        <div className="lg:pr-12">
            <h2 className="text-5xl md:text-7xl font-black mb-8 leading-none tracking-tighter">
                PARTNER<br/>
                <span className="ml-12 text-blue-600">OR</span><br/>
                REPLACEMENT?
            </h2>
            <p className="text-xl text-gray-800 mb-8 font-serif leading-relaxed max-w-md ml-auto lg:mr-0 border-l-4 border-black pl-6">
                AI supports <strong>divergent thinking</strong>. It doesn't need to be the artist; it can be the muse. 
                Use the machine to visualize the impossible, then apply your human intent.
            </p>
            
            <div className="bg-gray-50 p-8 rounded-none border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-transform">
                <label className="block text-sm font-bold uppercase tracking-wider mb-2">Prompt the machine</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A sculpture made of light and sound..."
                        className="flex-1 bg-transparent border-b-2 border-gray-300 focus:border-blue-600 outline-none py-2 text-lg font-mono placeholder-gray-400"
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt}
                        className="bg-black text-white p-3 hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                    </button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2 font-mono">{error}</p>}
            </div>
        </div>

        {/* Image Output Column */}
        <div className="relative min-h-[400px] flex items-center justify-center">
             {generatedImage ? (
                 <div className="relative p-2 border border-gray-200 shadow-xl bg-white transform rotate-3 transition-transform duration-500 hover:rotate-0">
                     <img src={generatedImage} alt="AI Generated" className="w-full h-auto max-h-[500px] object-contain" />
                     <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 text-xs font-mono border border-black/10">
                         GENERATED_BY_GEMINI
                     </div>
                 </div>
             ) : (
                 <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center text-gray-400">
                     <Sparkles size={48} className="mb-4 text-gray-300" />
                     <p className="font-mono text-sm text-center px-8">
                         Waiting for human input...<br/>
                         The canvas is empty.
                     </p>
                 </div>
             )}
        </div>
      </div>
    </section>
  );
};

export default FutureGenerator;