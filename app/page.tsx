'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CashCloudCheckout from './components/CashCloudCheckout';

export default function LuxuryStorefront() {
  const supabase = createClientComponentClient();
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('status', 'approved');
      if (data) setProducts(data);
    };
    fetchProducts();

    // Custom cursor logic
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursor-ring');
    
    const moveCursor = (e: MouseEvent) => {
      if (cursor && ring) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [supabase]);

  const handleCheckout = (price: number, productId: string) => {
    setCartTotal(price);
    setSelectedProduct(productId);
    setShowCheckout(true);
  };

  return (
    <div className="bg-[#050505] min-h-screen text-[#F0EAD6] selection:bg-[#D4AF37] selection:text-[#050505]">
      {/* Custom Cursor */}
      <div id="cursor" className="fixed w-2 h-2 bg-[#D4AF37] rounded-full pointer-events-none z-[9999] transition-transform duration-200"></div>
      <div id="cursor-ring" className="fixed w-8 h-8 border border-[#D4AF37]/50 rounded-full pointer-events-none z-[9998] transition-all duration-300 -translate-x-1/2 -translate-y-1/2"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-[#D4AF37]/10">
        <h1 className="font-['Cormorant_Garamond'] text-2xl tracking-[0.3em] uppercase text-[#D4AF37]">
          Elite Novelties
        </h1>
        <div className="flex gap-8 text-[10px] uppercase tracking-[0.3em] opacity-60 hidden md:flex">
           <a href="#" className="hover:text-[#D4AF37] transition-colors">Collection</a>
           <a href="#" className="hover:text-[#D4AF37] transition-colors">Wellness</a>
           <a href="#" className="hover:text-[#D4AF37] transition-colors">Concierge</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-48 pb-24 px-8 max-w-7xl mx-auto flex flex-col gap-24 items-center">
        <div className="text-center space-y-8">
           <h2 className="font-['Cormorant_Garamond'] text-5xl md:text-7xl font-light italic leading-tight text-[#D4AF37]">
             The Alchemy of <br/> 
             <span className="not-italic text-[#FDF5E6]">Ultra-Luxury</span>
           </h2>
           <p className="font-['Lato'] text-sm leading-relaxed opacity-60 max-w-md mx-auto">
             A fusion of high-fidelity aesthetics and mirror-settlement precision. 
             Experience a world where transaction meets transcendence.
           </p>
        </div>

        {/* Dynamic Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 w-full">
          {products.map((product) => (
            <div key={product.id} className="relative group flex flex-col bg-[#0C0C0C] rounded-[40px] border border-[#D4AF37]/20 overflow-hidden hover:border-[#D4AF37]/50 transition-colors">
              <div className="aspect-[4/5] relative bg-gray-900 overflow-hidden">
                 {product.image_url ? (
                   <img src={product.image_url} alt={product.name} loading="eager" fetchPriority="high" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                 ) : (
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 border border-[#D4AF37]/10 rounded-full animate-spin-slow"></div>
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0B1426] to-transparent opacity-60"></div>
              </div>
              
              <div className="p-8 flex flex-col gap-4 relative z-10 flex-grow">
                 <div>
                   <h3 className="font-['Cormorant_Garamond'] text-2xl text-[#D4AF37] mb-2">{product.name}</h3>
                   <p className="font-['Lato'] text-[10px] uppercase tracking-widest opacity-50 line-clamp-3">{product.description}</p>
                 </div>
                 <div className="mt-auto flex items-center justify-between">
                    <span className="text-xl font-bold tracking-widest text-[#FDF5E6]">${product.price}</span>
                    <button 
                      onClick={() => handleCheckout(product.price, product.id)}
                      className="bg-[#D4AF37] text-[#050505] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
                    >
                      Acquire Now
                    </button>
                 </div>
              </div>

              {/* IoT Indicator Placeholder */}
              <div className="absolute top-6 right-6 bg-[#0B1426]/80 backdrop-blur border border-[#D4AF37]/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#00C851] animate-pulse"></div>
                 <p className="text-[8px] font-bold tracking-widest uppercase">Verified</p>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-20 text-center text-[#D4AF37]/50 italic">
              Awaiting Elite Collection Integration...
            </div>
          )}
        </div>
      </main>

      {/* Checkout Overlay */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-2xl flex items-center justify-center p-8 overflow-y-auto">
          <div className="relative w-full max-w-2xl">
            <button 
              onClick={() => setShowCheckout(false)}
              className="absolute -top-12 right-0 p-2 text-[#D4AF37] text-2xl hover:scale-110 transition-transform"
            >
              ✕
            </button>
            <CashCloudCheckout 
              amount={cartTotal} 
              currency="USD" 
              productId={selectedProduct || "AESTHETIC-01"} 
              customerId={`CUST-${Math.floor(Math.random() * 10000)}`} 
            />
          </div>
        </div>
      )}

      {/* Gold Accents */}
      <div className="fixed bottom-12 left-12 h-24 w-[1px] bg-gradient-to-t from-[#D4AF37] to-transparent opacity-30"></div>
      <div className="fixed bottom-12 left-12 flex gap-4 rotate-90 origin-left ml-4 text-[8px] uppercase tracking-[0.5em] opacity-30">
        <span>Altovex Global Logistics</span>
        <span>Mirror Settlement V1</span>
      </div>
    </div>
  );
}
