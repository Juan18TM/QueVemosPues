import { X, Heart, Star } from 'lucide-react';
import { useStore } from '../../estado/useStore';
import './PanelDetalle.css';

export default function PanelDetalle({ detalle, similares = [], onClose, onClickSimilar }) {
  const { usuario, esFavorito, agregarFavorito, eliminarFavorito } = useStore();

  if (!detalle) return null;

  const esFav = esFavorito(detalle.id, detalle.tipo);

  const toggleFavorito = () => {
    if (!usuario) return;
    if (esFav) eliminarFavorito(detalle.id, detalle.tipo);
    else agregarFavorito(detalle);
  };

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
