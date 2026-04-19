'use client';
import { useState } from 'react';

export default function Home() {
  const [location, setLocation] = useState('Dunvilla, MN');
  const [minPrice, setMinPrice] = useState('250000');
  const [minBeds, setMinBeds] = useState('3');
  const [minAcres, setMinAcres] = useState('5');

  const handleSearch = () => {
    const params = new URLSearchParams({
      location,
      minPrice,
      minBeds,
      minAcres
    });
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <div className="relative h-screen flex items-center justify-center bg-black">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/1920/1080')] bg-cover opacity-50"></div>
        
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4">Minnesota Rural Homes & Hunting Land</h1>
          <p className="text-2xl mb-10">Near Dunvilla, Otter Tail County – Acreage, Woods, Lakes</p>

          <div className="bg-zinc-900/95 p-8 rounded-3xl border border-emerald-900 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 p-4 rounded-2xl text-lg focus:outline-none focus:border-emerald-600"
                placeholder="Dunvilla, MN or Zip"
              />
              <input 
                type="number" 
                value={minPrice} 
                onChange={(e) => setMinPrice(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 p-4 rounded-2xl text-lg focus:outline-none focus:border-emerald-600"
                placeholder="Min Price $"
              />
              <input 
                type="number" 
                value={minBeds} 
                onChange={(e) => setMinBeds(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 p-4 rounded-2xl text-lg focus:outline-none focus:border-emerald-600"
                placeholder="Min Beds"
              />
              <input 
                type="number" 
                value={minAcres} 
                onChange={(e) => setMinAcres(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 p-4 rounded-2xl text-lg focus:outline-none focus:border-emerald-600"
                placeholder="Min Acres"
              />
            </div>
            
            <button 
              onClick={handleSearch}
              className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-2xl text-2xl font-bold transition"
            >
              Search Properties Near Dunvilla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
