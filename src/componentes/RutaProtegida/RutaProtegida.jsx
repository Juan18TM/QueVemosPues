import { Navigate } from 'react-router-dom';
import { useStore } from '../../estado/useStore';

export default function RutaProtegida({ children }) {
  const { usuario, cargandoAuth } = useStore();

  if (cargandoAuth) {
    return (
      <div className="spinner-contenedor" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
