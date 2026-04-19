import { useState, useEffect } from 'react';
import { fetchStaticGTFS } from '../api/trafiklab';

export function useStaticGTFS() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!import.meta.env.VITE_TRAFIKLAB_STATIC_KEY) {
      setLoading(false);
      return;
    }

    let mounted = true;
    fetchStaticGTFS()
      .then(result => { if (mounted && result) setData(result); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  return { data, loading };
}
