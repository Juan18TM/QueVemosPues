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
    setCargandoProveedores(true);
    if (detalle.tipo === 'anime') {
      import('../../servicios/servicioJikan').then(mod => {
        mod.obtenerProveedoresAnime(detalle.id)
          .then(data => setProveedores(data))
          .catch(() => setProveedores(null))
          .finally(() => setCargandoProveedores(false));
      });
    } else {
      obtenerProveedores(detalle.id, detalle.tipo)
        .then(data => setProveedores(data))
        .catch(() => setProveedores(null))
        .finally(() => setCargandoProveedores(false));
    }
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

        {/* Sección de streaming - películas, series y anime */}
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
                    href={p.link || proveedores.link}
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
            <div className="panel-streaming-discovery">
              <p className="discovery-texto">
                No se encontraron plataformas de suscripción activas en tu región. Consulta disponibilidad global:
              </p>
              
              <div className="discovery-botones">
                {detalle.tipo === 'anime' ? (
                  <>
                    <a
                      href={`https://www.livechart.me/search?q=${encodeURIComponent(detalle.titulo)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="boton-discovery livechart"
                    >
                      <Tv size={16} />
                      Consultar en LiveChart.me
                    </a>
                    <a
                      href={`https://myanimelist.net/anime.php?q=${encodeURIComponent(detalle.titulo)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="boton-discovery mal"
                    >
                      <ExternalLink size={16} />
                      Ficha en MyAnimeList
                    </a>
                  </>
                ) : (
                  <a
                    href={proveedores?.link || `https://www.justwatch.com/co/buscar?q=${encodeURIComponent(detalle.titulo)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="boton-discovery justwatch"
                  >
                    <Tv size={16} />
                    Consultar en JustWatch
                    <ExternalLink size={14} className="ms-auto" />
                  </a>
                )}
                
                <a
                  href={`https://www.google.com/search?q=donde+ver+${encodeURIComponent(detalle.titulo)}+online+streaming`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="boton-discovery google"
                >
                  <ExternalLink size={14} />
                  Búsqueda general en Google
                </a>
              </div>
            </div>
          )}
        </div>

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
