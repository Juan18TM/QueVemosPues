import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useStore } from '../../estado/useStore';
import './Auth.css';

export default function Registro() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);
  const { registrarse } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCargando(true);
    try {
      await registrarse(email, password);
      navigate('/perfil');
    } catch (err) {
      setError(err.message || 'Error al crear cuenta');
    } finally {
      setCargando(false);
    }
  };


  return (
    <div className="auth-pagina">
      <div className="auth-contenedor animar-aparecer">
        <div className="auth-header">
          <Link to="/" className="auth-logo">QueVemosPues</Link>
          <h1 className="auth-titulo">Crear cuenta</h1>
          <p className="auth-subtitulo">Únete y descubre tu próximo favorito con IA</p>
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
                placeholder="Mínimo 6 caracteres"
                className="auth-input"
                required
              />
              <button type="button" className="auth-toggle-pw" onClick={() => setVerPassword(!verPassword)}>
                {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-campo">
            <label className="auth-label">Confirmar contraseña</label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icono" />
              <input
                type={verPassword ? 'text' : 'password'}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="auth-input"
                required
              />
            </div>
          </div>

          <button type="submit" className="boton-primario auth-submit" disabled={cargando}>
            {cargando ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Crear Cuenta'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
