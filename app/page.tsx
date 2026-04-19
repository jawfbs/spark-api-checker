'use client';
import { useState } from 'react';

export default function Home() {
  const [location, setLocation] = useState('Dunvilla, MN 56528');
  const [minPrice, setMinPrice] = useState('250000');
  const [maxPrice, setMaxPrice] = useState('800000');
  const [minBeds, setMinBeds] = useState('3');
  const [minAcres, setMinAcres] = useState('5');

  const handleSearch = () => {
    const params = new URLSearchParams({ location, minPrice, maxPrice, minBeds, minAcres });
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-xl">🏠</div>
            <span className="text-2xl font-bold tracking-tight">MN Hunt Homes</span>
          </div>
          <div className="flex gap-8 text-lg">
            <a href="#" className="hover:text-emerald-400">Search</a>
            <a href="#" className="hover:text-emerald-400">Saved</a>
            <a href="#" className="hover:text-emerald-400">My Hunts</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">Jake • Dunvilla</div>
            <div className="w-10 h-10 bg-zinc-700 rounded-full"></div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-screen flex items-center justify-center pt-20">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/id/1015/2000/1200')] bg-cover brightness-50"></div>
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <h1 className="text-7xl font-bold tracking-tighter mb-6">Find Your Minnesota Hunting Land</h1>
          <p className="text-3xl mb-12 text-zinc-300">Rural homes • 5+ acres • Lakes • Woods near Dunvilla, Otter Tail County</p>

          <div className="bg-zinc-900/95 backdrop-blur-xl p-10 rounded-3xl border border-zinc-700 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-lg col-span-2" placeholder="Dunvilla or Zip" />
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-lg" placeholder="Min $" />
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-lg" placeholder="Max $" />
              <button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl text-2xl font-semibold transition-all active:scale-95">Search Now</button>
            </div>

            <div className="flex flex-wrap gap-4 mt-8 justify-center">
              <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm flex items-center gap-2">3+ Beds</button>
              <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm flex items-center gap-2">5+ Acres</button>
              <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm flex items-center gap-2">Near Lake</button>
              <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm flex items-center gap-2">Hunting Friendly</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
