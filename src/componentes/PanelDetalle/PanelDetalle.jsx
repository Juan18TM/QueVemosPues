import { useState, useEffect } from 'react';
import { X, Heart, Star, ExternalLink, Tv } from 'lucide-react';
import { useStore } from '../../estado/useStore';
import { obtenerProveedores } from '../../servicios/servicioTMDB';
import './PanelDetalle.css';

export default function PanelDetalle({ detalle, similares = [], onClose, onClickSimilar }) {
  const { usuario, esFavorito, agregarFavorito, eliminarFavorito } = useStore();
  const [proveedores, setProveedores] = useState(null);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);

  if (!detalle) return null;

  const esFav = esFavorito(detalle.id, detalle.tipo);

  const toggleFavorito = () => {
    if (!usuario) return;
    if (esFav) eliminarFavorito(detalle.id, detalle.tipo);
    else agregarFavorito(detalle);
  };

  // Cargar proveedores de streaming cuando cambie el detalle
  useEffect(() => {
    if (detalle.tipo === 'anime') {
      setProveedores(null);
      return;
    }
    setCargandoProveedores(true);
    obtenerProveedores(detalle.id, detalle.tipo)
      .then(data => setProveedores(data))
      .catch(() => setProveedores(null))
      .finally(() => setCargandoProveedores(false));
  }, [detalle.id, detalle.tipo]);

  const nombreTipo = { pelicula: 'MOVIE', serie: 'TV SHOW', anime: 'ANIME' };

  return (
    <div className="panel-detalle animar-deslizar">
      <button className="panel-cerrar" onClick={onClose}>
        <X size={20} />
      </button>

      {detalle.fondo && (
        <div className="panel-fondo">
          <img src={detalle.fondo || detalle.imagen} alt="" />
          <div className="panel-fondo-overlay" />
        </div>
      )}

      <div className="panel-contenido">
        {detalle.generos?.length > 0 && (
          <div className="panel-generos">
            {detalle.generos.map(g => (
              <span key={g} className="etiqueta">{g}</span>
            ))}
          </div>
        )}

        <h2 className="panel-titulo">{detalle.titulo}</h2>

        <div className="panel-meta">
          {detalle.rating && detalle.rating !== 'N/A' && (
            <span className="panel-meta-item panel-rating">
              <Star size={14} fill="currentColor" /> {detalle.rating}
            </span>
          )}
          {detalle.anio && <span className="panel-meta-item">{detalle.anio}</span>}
          {detalle.duracion && <span className="panel-meta-item">{detalle.duracion}</span>}
        </div>

        <div className="panel-seccion">
          <h4 className="panel-seccion-titulo">SYNOPSIS</h4>
          <p className="panel-descripcion">{detalle.descripcion}</p>
        </div>

        {/* Sección de streaming - películas y series */}
        {detalle.tipo !== 'anime' && (
          <div className="panel-seccion">
            <h4 className="panel-seccion-titulo">DISPONIBLE EN</h4>
            {cargandoProveedores ? (
              <div className="panel-streaming-cargando">Buscando plataformas...</div>
            ) : proveedores && proveedores.plataformas.length > 0 ? (
              <>
                <div className="panel-streaming-logos">
                  {proveedores.plataformas.map(p => (
                    <a
                      key={p.nombre}
                      href={proveedores.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="panel-streaming-item"
                      title={`Ver en ${p.nombre}`}
                    >
                      <img src={p.logo} alt={p.nombre} />
                      <span>{p.nombre}</span>
                    </a>
                  ))}
                </div>
                {proveedores.link && (
                  <a
                    href={proveedores.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="panel-donde-btn"
                  >
                    <ExternalLink size={14} />
                    Ver todas las opciones
                  </a>
                )}
              </>
            ) : (
              <a
                href={`https://www.google.com/search?q=d%C3%B3nde+ver+${encodeURIComponent(detalle.titulo)}+online`}
                target="_blank"
                rel="noopener noreferrer"
                className="panel-streaming-no-disponible"
              >
                <Tv size={18} />
                <span>No disponible en streaming — Buscar dónde verla</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {/* Enlace para anime */}
        {detalle.tipo === 'anime' && (
          <a
            href={`https://myanimelist.net/anime/${detalle.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="panel-donde-btn"
          >
            <ExternalLink size={16} />
            Ver en MyAnimeList
          </a>
        )}

        {similares.length > 0 && (
          <div className="panel-seccion">
            <h4 className="panel-seccion-titulo">CONTENIDO SIMILAR</h4>
            <div className="panel-similares">
              {similares.slice(0, 6).map(item => (
                <div
                  key={item.id}
                  className="panel-similar-item"
                  onClick={() => onClickSimilar?.(item)}
                >
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.titulo} />
                  ) : (
                    <div className="panel-similar-placeholder"><Star size={16} /></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {usuario && (
          <button
            className={`panel-fav-btn ${esFav ? 'activo' : ''}`}
            onClick={toggleFavorito}
          >
            <Heart size={18} fill={esFav ? 'currentColor' : 'none'} />
            {esFav ? 'En Favoritos' : 'Añadir a Favoritos'}
          </button>
        )}
      </div>
    </div>
  );
}
