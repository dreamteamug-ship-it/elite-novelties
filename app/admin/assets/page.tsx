'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function CTOCommandCenter() {
  const supabase = createClientComponentClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalKesSettled, setTotalKesSettled] = useState<number>(0);

  useEffect(() => {
    fetchData();
    // Real-time subscription to logs
    const channel = supabase
      .channel('logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const fetchData = async () => {
    const { data: logsData } = await supabase.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(20);
    const { data: productsData } = await supabase.from('products').select('*').eq('status', 'pending_approval');
    const { data: settlementsData } = await supabase.from('settlements').select('amount_kes').eq('status', 'completed');
    
    if (logsData) setLogs(logsData);
    if (productsData) setPendingProducts(productsData);
    
    if (settlementsData) {
      const total = settlementsData.reduce((acc, curr) => acc + (curr.amount_kes || 0), 0);
      setTotalKesSettled(total);
    }
  };

  const triggerSwarm = async () => {
    setLoading(true);
    await fetch('/api/admin/swarm/trigger', { method: 'POST' });
    setLoading(false);
  };

  const runFullSimulator = async () => {
    setLoading(true);
    await fetch('/api/admin/simulator/run', { method: 'POST' });
    setLoading(false);
    fetchData(); // Refresh products & ledger
  };

  const approveProduct = async (id: string) => {
    await supabase.from('products').update({ status: 'approved' }).eq('id', id);
    setPendingProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0B101B] text-[#FDF5E6] p-4 lg:p-12 font-['Lato']">
      {/* Gold Header Bar */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12 border-b border-[#D4AF37]/30 pb-8">
        <div>
          <h1 className="font-['Montserrat'] text-3xl tracking-[0.2em] text-[#D4AF37] uppercase">CTO AI Command Center</h1>
          <p className="text-[10px] tracking-[0.4em] opacity-40 uppercase mt-2">Autonomous Swarm Monitor V1.1</p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="text-right">
            <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">Total Settled (Cooperative Bank)</p>
            <p className="text-3xl font-['Montserrat'] font-bold text-[#00C851]">KES {totalKesSettled.toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={runFullSimulator}
              disabled={loading}
              className={`luxury-button px-8 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-[#D4AF37]/20 ${loading ? 'opacity-50' : ''}`}
              style={{ border: '1px solid #D4AF37', color: '#D4AF37' }}
            >
              {loading ? 'RUNNING TEST...' : 'RUN E2E TEST'}
            </button>
            <button 
              onClick={triggerSwarm}
              disabled={loading}
              className={`luxury-button px-8 py-3 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-[#D4AF37]/20 ${loading ? 'opacity-50' : ''}`}
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)', color: '#0B101B' }}
            >
              {loading ? 'SWARM DEPLOYING...' : 'FORCE SWARM CYCLE'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* SWARM MONITOR: 95% Autonomous Logs */}
        <div className="lg:col-span-2 space-y-8">
           <section className="bg-white/5 border border-[#D4AF37]/20 rounded-[30px] p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-['Montserrat'] text-[#D4AF37] uppercase tracking-widest">Autonomous Swarm Monitor</h2>
                <span className="flex items-center gap-2 text-[10px] text-[#00C851] animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-[#00C851]"></div> LIVE AGENTS ONLINE
                </span>
              </div>
              
              <div className="h-96 overflow-y-auto space-y-3 font-mono text-[11px] custom-scrollbar pr-4">
                 {logs.map((log, i) => (
                   <div key={i} className={`p-3 rounded-lg border-l-2 ${log.severity === 'success' ? 'border-[#00C851] bg-[#00C851]/5' : log.severity === 'error' ? 'border-[#FF4444] bg-[#FF4444]/5' : 'border-[#D4AF37]/40 bg-white/5'}`}>
                      <span className="opacity-40">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                      <span className="text-[#D4AF37] ml-2">[{log.agent_name}]</span> {log.message}
                   </div>
                 ))}
                 {logs.length === 0 && <div className="text-center py-20 opacity-30 italic">Awaiting Autonomous Cycle Initiation...</div>}
              </div>
           </section>

           {/* 5% HUMAN APPROVAL: The "CTO" Gatekeeper */}
           <section className="bg-white/5 border border-[#D4AF37]/20 rounded-[30px] p-8">
              <h2 className="text-xl font-['Montserrat'] text-[#D4AF37] uppercase tracking-widest mb-6">CTO Approval Queue (5% Human Loop)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {pendingProducts.map(p => (
                   <div key={p.id} className="bg-[#FDF5E6] rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-105">
                      <div className="aspect-square bg-gray-200">
                        {p.image_url && <img src={p.image_url} loading="eager" fetchPriority="high" className="w-full h-full object-cover" alt={p.name}/>}
                      </div>
                      <div className="p-6 text-[#0B101B]">
                         <h3 className="font-bold text-sm uppercase truncate mb-2">{p.name}</h3>
                         <p className="text-[10px] line-clamp-2 opacity-70 mb-4">{p.description}</p>
                         <div className="flex justify-between items-center">
                            <span className="font-bold text-blue-900">${p.price}</span>
                            <button 
                              onClick={() => approveProduct(p.id)}
                              className="bg-[#0B101B] text-[#D4AF37] text-[10px] font-bold px-4 py-2 rounded-lg"
                            >
                              APPROVE & DEPLOY
                            </button>
                         </div>
                      </div>
                   </div>
                 ))}
                 {pendingProducts.length === 0 && <div className="col-span-full py-20 text-center opacity-30 italic">No Warehoused Assets Pending Approval.</div>}
              </div>
           </section>
        </div>

        {/* System Diagnostics & IoT */}
        <div className="space-y-8">
           <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-[30px] p-8">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 mb-6">Global Settlement Diagnostics</h3>
              <div className="space-y-4 text-[11px] uppercase tracking-widest">
                 <div className="flex justify-between border-b border-[#D4AF37]/10 pb-2"><span>M-PESA PAYBILL</span> <span className="text-[#00C851]">SETTLED</span></div>
                 <div className="flex justify-between border-b border-[#D4AF37]/10 pb-2"><span>EQUITY JENGA</span> <span className="text-[#00C851]">READY</span></div>
                 <div className="flex justify-between border-b border-[#D4AF37]/10 pb-2"><span>USDT TRC20</span> <span className="text-[#D4AF37]">MONITORING</span></div>
                 <div className="flex justify-between"><span>STRIPE BRIDGE</span> <span className="text-[#00C851]">ACTIVE</span></div>
              </div>
           </div>

           <div className="bg-white/5 border border-[#D4AF37]/20 rounded-[30px] p-8">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 mb-6">IoT Device Status</h3>
              <div className="p-6 border border-dashed border-[#D4AF37]/20 rounded-2xl text-center">
                 <div className="w-12 h-12 bg-[#00C851]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <div className="w-4 h-4 bg-[#00C851] rounded-full"></div>
                 </div>
                 <p className="text-[10px] font-bold tracking-widest uppercase">Bio-Metric Aesthetic-01</p>
                 <p className="text-[8px] opacity-40 mt-1 uppercase">Sande Allan Wallet Connected</p>
              </div>
           </div>
        </div>
      </main>
      
      <style jsx>{`
        .luxury-button:hover { filter: brightness(1.2); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D4AF37; border-radius: 10px; }
      `}</style>
    </div>
  );
}
