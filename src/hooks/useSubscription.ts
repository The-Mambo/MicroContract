import { useState, useEffect } from 'react';
import { getUserSubscription, getUserOrders, type UserSubscription, type UserOrder } from '../services/subscriptionService';
import { useAuth } from './useAuth';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setOrders([]);
      return;
    }

    setLoading(true);

    Promise.all([
      getUserSubscription(),
      getUserOrders()
    ])
      .then(([subscriptionData, ordersData]) => {
        setSubscription(subscriptionData);
        setOrders(ordersData);
      })
      .catch((error) => {
        console.error('Error fetching subscription data:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  return { subscription, orders, loading };
}