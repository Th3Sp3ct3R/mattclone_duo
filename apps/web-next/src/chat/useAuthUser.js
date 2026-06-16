'use client';

import { useEffect, useState } from 'react';

const initialState = {
  user: null,
  loading: true
};

export function useAuthUser() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (!isMounted) return;
        if (response.ok && data?.user) {
          setState({ user: data.user, loading: false });
          return;
        }
        setState({ user: null, loading: false });
      } catch {
        if (isMounted) {
          setState({ user: null, loading: false });
        }
      }
    }

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
