'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const StripePaymentForm = ({ clientSecret, orderId }: { clientSecret: string, orderId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/success?orderId=${orderId}` },
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button disabled={loading} className="w-full bg-[#D4AF37] text-[#0B1426] font-bold py-4 rounded-xl uppercase tracking-widest">
        {loading ? 'Authorizing...' : 'Pay Now'}
      </button>
    </form>
  );
};

export default function CashCloudCheckout({ amount, currency, productId, customerId }: { amount: number, currency: string, productId: string, customerId: string }) {
  const [provider, setProvider] = useState<'stripe' | 'mpesa' | 'paypal' | 'usdt'>('stripe');
  const [phone, setPhone] = useState('');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, amount, currency, productId, customerId, metadata: { phone } }),
      });
      const data = await res.json();
      setCheckoutData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-[#FDF5E6] rounded-[30px] p-8 shadow-2xl text-[#0B1426]">
      <div className="text-center mb-8">
        <h1 className="font-['Montserrat'] text-2xl font-bold uppercase tracking-widest text-[#D4AF37]">Mirror Settlement</h1>
        <p className="text-[10px] uppercase opacity-60">Production Global Gateway</p>
      </div>

      {!checkoutData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {['stripe', 'mpesa', 'paypal', 'usdt'].map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p as any)}
                className={`py-3 px-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${provider === p ? 'bg-[#0B1426] text-[#D4AF37] border-[#D4AF37]' : 'border-[#0B1426]/10 text-[#0B1426]/40'}`}
              >
                {p === 'stripe' ? 'Cards / Wallets' : p === 'mpesa' ? 'M-PESA (Kenya)' : p === 'usdt' ? 'Crypto (USDT)' : 'PayPal'}
              </button>
            ))}
          </div>

          {provider === 'mpesa' && (
            <input
              type="tel"
              placeholder="Safaricom Phone Number (254...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-4 rounded-xl border border-[#0B1426]/10 bg-white"
            />
          )}

          <div className="bg-[#0B1426]/5 p-6 rounded-2xl flex justify-between items-center">
            <span className="text-sm font-bold uppercase opacity-60">Total Amount</span>
            <span className="text-2xl font-bold">{amount} {currency}</span>
          </div>

          <button
            onClick={startCheckout}
            disabled={loading}
            className="w-full bg-[#0B1426] text-[#D4AF37] py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg"
          >
            {loading ? 'Processing...' : 'Initiate Settlement'}
          </button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          {provider === 'stripe' && (
            <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.clientSecret }}>
              <StripePaymentForm clientSecret={checkoutData.clientSecret} orderId={checkoutData.orderId} />
            </Elements>
          )}

          {provider === 'mpesa' && (
            <div className="text-center p-8 bg-white rounded-2xl border border-[#0B1426]/10">
              <div className="w-16 h-16 bg-[#00C851] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <span className="text-white text-2xl font-bold">!</span>
              </div>
              <p className="font-bold mb-2">Check Your Phone</p>
              <p className="text-xs opacity-60">{checkoutData.instructions}</p>
            </div>
          )}

          {(provider === 'usdt' || provider === 'paypal') && (
            <div className="text-center p-8 bg-white rounded-2xl border border-[#0B1426]/10">
              <p className="font-bold mb-4">{provider === 'usdt' ? 'Send USDT (TRC20)' : 'Pay via PayPal'}</p>
              {provider === 'usdt' && (
                <div className="p-4 bg-gray-100 rounded-lg break-all font-mono text-[10px] mb-4">
                  {checkoutData.walletAddress}
                </div>
              )}
              <a href={checkoutData.paymentUrl || '#'} className="luxury-button inline-block px-8 py-3 rounded-lg text-xs font-bold uppercase">
                {provider === 'usdt' ? 'Verify Payment' : 'Proceed to PayPal'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
