import { useState, useEffect, useRef } from 'react';

export function useDebounce(valor, retraso = 500) {
  const [valorDebounce, setValorDebounce] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setValorDebounce(valor), retraso);
    return () => clearTimeout(timer);
  }, [valor, retraso]);

  return valorDebounce;
}

export function useClickFuera(callback) {
  const ref = useRef(null);

  useEffect(() => {
    function manejarClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    }
    document.addEventListener('mousedown', manejarClick);
    return () => document.removeEventListener('mousedown', manejarClick);
  }, [callback]);

  return ref;
}
