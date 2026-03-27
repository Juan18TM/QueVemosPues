import { useState, useEffect } from 'react';
import { Heart, Search, Trash2 } from 'lucide-react';
import TarjetaContenido from '../../componentes/TarjetaContenido/TarjetaContenido';
import PanelDetalle from '../../componentes/PanelDetalle/PanelDetalle';
import { useStore } from '../../estado/useStore';
import { obtenerDetalles, obtenerSimilares } from '../../servicios/servicioTMDB';
import { obtenerDetallesAnime, obtenerRecomendacionesAnime } from '../../servicios/servicioJikan';
import './Favoritos.css';

export default function Favoritos() {
  const { usuario, favoritos, cargarFavoritos, historial, cargarHistorial } = useStore();
  const [filtro, setFiltro] = useState('todo');
  const [busqueda, setBusqueda] = useState('');
  const [detalleActual, setDetalleActual] = useState(null);
  const [similares, setSimilares] = useState([]);

  useEffect(() => {
    if (usuario) {
      cargarFavoritos();
      cargarHistorial();
    }
  }, [usuario]);

  async function abrirDetalle(contenido) {
    try {
      let detalle, sims;
      if (contenido.tipo === 'anime') {
        [detalle, sims] = await Promise.all([
          obtenerDetallesAnime(contenido.id_contenido || contenido.id),
          obtenerRecomendacionesAnime(contenido.id_contenido || contenido.id)
        ]);
      } else {
        [detalle, sims] = await Promise.all([
          obtenerDetalles(contenido.id_contenido || contenido.id, contenido.tipo),
          obtenerSimilares(contenido.id_contenido || contenido.id, contenido.tipo)
        ]);
      }
      setDetalleActual(detalle);
      setSimilares(sims);
    } catch (err) {
      console.error(err);
    }
  }

  // Convertir favoritos de BD al formato de TarjetaContenido
  const favoritosFormateados = favoritos.map(f => ({
    id: f.id_contenido,
    titulo: f.titulo,
    imagen: f.imagen,
    tipo: f.tipo,
    rating: null,
    anio: ''
  }));

  const favoritosFiltrados = favoritosFormateados
    .filter(f => filtro === 'todo' || f.tipo === filtro)
    .filter(f => !busqueda || f.titulo.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="favoritos-pagina contenedor">
      {/* Perfil header */}
      <section className="perfil-header animar-aparecer">
        <div className="perfil-avatar">
          <Heart size={28} />
        </div>
        <div className="perfil-info">
          <span className="perfil-badge">MIEMBRO</span>
          <h1 className="perfil-nombre">{usuario?.email?.split('@')[0] || 'Usuario'}</h1>
          <div className="perfil-stats">
            <div className="perfil-stat">
              <strong>{favoritos.length}</strong>
              <span>FAVORITOS</span>
            </div>
            <div className="perfil-stat">
              <strong>{historial.length}</strong>
              <span>BÚSQUEDAS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <div className="favoritos-toolbar">
        <div className="favoritos-filtros">
          {['todo', 'pelicula', 'serie', 'anime'].map(t => (
            <button
              key={t}
              className={`buscar-filtro ${filtro === t ? 'activo' : ''}`}
              onClick={() => setFiltro(t)}
            >
              {t === 'todo' ? 'Todo' : t === 'pelicula' ? 'Películas' : t === 'serie' ? 'Series' : 'Anime'}
            </button>
          ))}
        </div>
        <div className="favoritos-buscar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar en favoritos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Contenido */}
      <div className={`favoritos-layout ${detalleActual ? 'con-detalle' : ''}`}>
        <div className="favoritos-grid-wrapper">
          {favoritosFiltrados.length > 0 ? (
            <div className="grid-contenido animar-escalonado">
              {favoritosFiltrados.map((item, i) => (
                <TarjetaContenido
                  key={`${item.tipo}-${item.id}`}
                  contenido={item}
                  onClick={abrirDetalle}
                  indice={i}
                />
              ))}
            </div>
          ) : (
            <div className="mensaje-vacio">
              <Heart size={40} style={{ marginBottom: 16, color: 'var(--favorito)' }} />
              <h3>No hay favoritos aún</h3>
              <p>Explora contenido y guarda tus favoritos para verlos aquí</p>
            </div>
          )}
        </div>

        {detalleActual && (
          <PanelDetalle
            detalle={detalleActual}
            similares={similares}
            onClose={() => { setDetalleActual(null); setSimilares([]); }}
            onClickSimilar={abrirDetalle}
          />
        )}
      </div>

      {/* Historial de búsqueda */}
      {historial.length > 0 && (
        <section className="historial-seccion animar-aparecer">
          <h3 className="historial-titulo">Historial de búsqueda</h3>
          <div className="historial-tags">
            {historial.map(h => (
              <span key={h.id} className="historial-tag">
                <Search size={12} /> {h.consulta}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
