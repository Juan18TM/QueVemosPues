import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useStore } from '../../estado/useStore';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await iniciarSesion(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-pagina">
      <div className="auth-contenedor animar-aparecer">
        <div className="auth-header">
          <Link to="/" className="auth-logo">QueVemosPues</Link>
          <div className="auth-badge">
            <Sparkles size={14} /> AI Entertainment
          </div>
          <h1 className="auth-titulo">Bienvenido de vuelta</h1>
          <p className="auth-subtitulo">Inicia sesión para acceder a tus recomendaciones personalizadas</p>
        </div>

        {error && <div className="mensaje-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-campo">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icono" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="auth-input"
                required
              />
            </div>
          </div>

          <div className="auth-campo">
            <label className="auth-label">Contraseña</label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icono" />
              <input
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input"
                required
              />
              <button type="button" className="auth-toggle-pw" onClick={() => setVerPassword(!verPassword)}>
                {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="boton-primario auth-submit" disabled={cargando}>
            {cargando ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta?{' '}
          <Link to="/registro">Regístrate gratis</Link>
        </p>
      </div>
    </div>
  );
}
