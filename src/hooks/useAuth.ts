import { useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentUser, type AuthUser } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user state
    getCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email || ''
          });
        }
      })
      .catch((error) => {
        console.error('Error getting current user:', error);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}