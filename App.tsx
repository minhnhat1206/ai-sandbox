import React from 'react';
import Hero from './components/Hero';
import ScrollyTelling from './components/ScrollyTelling';
import PresentationDeck from './components/PresentationDeck';
import Gallery from './components/Gallery';
import TuringGame from './components/TuringGame';
import TheoreticalAnalysis from './components/TheoreticalAnalysis';

const App: React.FC = () => {
  return (
    <main className="w-full min-h-screen">
      <Hero />
      <ScrollyTelling />
      <PresentationDeck />
      <Gallery />
      <TuringGame />
      <TheoreticalAnalysis />
      
      {/* Footer */}
      <footer className="bg-black text-white py-12 text-center border-t border-gray-800">
          <p className="font-mono text-sm text-gray-500">
              © 2024 Art in the Age of AI. Built with React.
          </p>
      </footer>
    </main>
  );
};

export default App;