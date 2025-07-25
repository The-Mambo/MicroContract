export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  priceId: string;
  price: number;
  mode: 'payment' | 'subscription';
  interval?: 'month' | 'year';
  popular?: boolean;
  features: string[];
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_Sdz8PGwuqtqf8P',
    name: 'Pay Per Check',
    description: 'Comprehensive risk analysis Detailed explanations Revision suggestions Export functionality Side-by-side comparison Priority processing',
    priceId: 'price_1RihAMH9UjiUVq1X9N2VniYs',
    price: 25,
    mode: 'payment',
    features: [
      'Comprehensive risk analysis',
      'Detailed explanations',
      'Revision suggestions',
      'Export functionality',
      'Side-by-side comparison',
      'Priority processing'
    ],
    popular: true
  },
  {
    id: 'prod_Sdz9MO674hKLsu',
    name: 'Pro',
    description: '',
    priceId: 'price_1RihBPH9UjiUVq1X9YN1izl7',
    price: 39,
    mode: 'subscription',
    interval: 'month',
    features: [
      'Unlimited contract analysis',
      'Priority support',
      'Contract templates',
      'Advanced analytics',
      'Bulk processing',
      'API access',
      'Custom integrations'
    ]
  }
];

export function formatPrice(price: number, mode: 'payment' | 'subscription', interval?: 'month' | 'year'): string {
  if (price === 0) return 'Free';
  
  const formattedPrice = `$${price}`;
  
  if (mode === 'subscription' && interval) {
    return `${formattedPrice}/${interval === 'month' ? 'mo' : 'yr'}`;
  }
  
  return formattedPrice;
}