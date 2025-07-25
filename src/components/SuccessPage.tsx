import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Download, FileText } from 'lucide-react';
import { stripeProducts } from '../stripe-config';

interface SuccessPageProps {
  onContinue: () => void;
}

export function SuccessPage({ onContinue }: SuccessPageProps) {
  const [purchasedProduct, setPurchasedProduct] = useState<string | null>(null);

  useEffect(() => {
    // Get the plan from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan');
    
    if (planId) {
      const product = stripeProducts.find(p => p.id === planId);
      setPurchasedProduct(product?.name || 'Unknown Plan');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          {purchasedProduct ? (
            <>Thank you for purchasing <strong>{purchasedProduct}</strong>. Your payment has been processed successfully.</>
          ) : (
            <>Thank you for your purchase! Your payment has been processed successfully.</>
          )}
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-center space-x-2 text-blue-800 mb-2">
            <FileText className="w-5 h-5" />
            <span className="font-medium">What's Next?</span>
          </div>
          <p className="text-sm text-blue-700">
            You can now upload and analyze your contracts with full access to all features.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Start Analyzing Contracts</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => window.print()}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Print Receipt</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </div>
  );
}