import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, Heart, User } from 'lucide-react';
import { useStore } from '../../estado/useStore';
import './Navbar.css';

export default function Navbar() {
  const { usuario, cerrarSesion } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await cerrarSesion();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-contenido contenedor">
        <Link to="/" className="navbar-logo">
          QueVemosPues
        </Link>

        <div className="navbar-enlaces">
          <Link to="/" className="navbar-enlace">Peliculas</Link>
          <Link to="/?tipo=serie" className="navbar-enlace">Series</Link>
          <Link to="/?tipo=anime" className="navbar-enlace">Anime</Link>
          {usuario && <Link to="/favoritos" className="navbar-enlace">Favoritos</Link>}
        </div>

        <div className="navbar-acciones">
          <Link to="/buscar" className="navbar-icono-ia" title="Búsqueda IA">
            <Sparkles size={18} />
          </Link>

          <div className="navbar-auth-container" key={usuario ? 'auth-in' : 'auth-out'}>
            {usuario ? (
              <div className="navbar-usuario">
                <Link to="/favoritos" className="navbar-icono-fav">
                  <Heart size={18} />
                </Link>
                <Link to="/perfil" className="navbar-avatar">
                  <User size={18} />
                </Link>
                <button onClick={handleLogout} className="boton-primario navbar-logout">
                  <LogOut size={14} />
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <Link to="/login" className="boton-primario">
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
