import React from 'react';
import { GalleryItem } from '../types';

const galleryItems: GalleryItem[] = [
  { id: '1', imageUrl: 'https://picsum.photos/seed/art1/600/600', prompt: 'A futuristic city floating in clouds, renaissance style', style: 'Renaissance', size: 'large' },
  { id: '2', imageUrl: 'https://picsum.photos/seed/art2/400/400', prompt: 'Portrait of a cyborg, oil painting', style: 'Oil', size: 'small' },
  { id: '3', imageUrl: 'https://picsum.photos/seed/art3/400/400', prompt: 'Abstract geometric shapes, bauhaus', style: 'Bauhaus', size: 'small' },
  { id: '4', imageUrl: 'https://picsum.photos/seed/art4/400/800', prompt: 'Cyberpunk street food vendor, neon lights', style: 'Cyberpunk', size: 'medium' },
  { id: '5', imageUrl: 'https://picsum.photos/seed/art5/600/400', prompt: 'Minimalist landscape, digital vector', style: 'Vector', size: 'medium' },
  { id: '6', imageUrl: 'https://picsum.photos/seed/art6/400/400', prompt: 'Surreal melting clock in a desert', style: 'Surrealism', size: 'small' },
];

const Gallery: React.FC = () => {
  return (
    <section className="py-24 px-4 md:px-8 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto mb-16">
        <h2 className="text-6xl md:text-8xl font-black text-black mb-4 tracking-tighter">
          THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">CHAOS</span> GALLERY
        </h2>
        <p className="text-xl text-gray-500 max-w-2xl font-mono">
          Infinite variations from a single seed. Hover to reveal the machine's instructions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-[200px] gap-4 max-w-7xl mx-auto">
        {galleryItems.map((item, i) => (
          <div 
            key={item.id}
            className={`relative group overflow-hidden rounded-3xl bg-gray-100 ${
              item.size === 'large' ? 'md:col-span-2 md:row-span-2' : 
              item.size === 'medium' ? 'md:col-span-2 md:row-span-1' : 
              'md:col-span-1 md:row-span-1'
            }`}
          >
            <img 
              src={item.imageUrl} 
              alt={item.prompt} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
                / {item.style}
              </span>
              <p className="text-white font-mono text-sm leading-relaxed">
                "{item.prompt}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Gallery;