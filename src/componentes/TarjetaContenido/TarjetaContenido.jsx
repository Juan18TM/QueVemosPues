import { Heart, Star } from 'lucide-react';
import { useStore } from '../../estado/useStore';
import './TarjetaContenido.css';

export default function TarjetaContenido({ contenido, onClick, indice = 0 }) {
  const { usuario, esFavorito, agregarFavorito, eliminarFavorito } = useStore();
  
  const esFav = esFavorito(contenido.id, contenido.tipo);

  const toggleFavorito = (e) => {
    e.stopPropagation();
    if (!usuario) return;
    
    if (esFav) {
      eliminarFavorito(contenido.id, contenido.tipo);
    } else {
      agregarFavorito(contenido);
    }
  };

  const etiquetaTipo = {
    pelicula: 'etiqueta-pelicula',
    serie: 'etiqueta-serie',
    anime: 'etiqueta-anime'
  };

  const nombreTipo = {
    pelicula: 'MOVIE',
    serie: 'TV SHOW',
    anime: 'ANIME'
  };

  return (
    <article
      className="tarjeta-contenido"
      onClick={() => onClick?.(contenido)}
      style={{ animationDelay: `${indice * 0.06}s` }}
    >
      <div className="tarjeta-imagen-wrapper">
        {contenido.imagen ? (
          <img
            src={contenido.imagen}
            alt={contenido.titulo}
            className="tarjeta-imagen"
            loading="lazy"
          />
        ) : (
          <div className="tarjeta-imagen-placeholder">
            <Star size={32} />
          </div>
        )}

        <div className="tarjeta-overlay">
          {usuario && (
            <button
              className={`tarjeta-fav-btn ${esFav ? 'activo' : ''}`}
              onClick={toggleFavorito}
              title={esFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              <Heart size={18} fill={esFav ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        <div className="tarjeta-badge-grupo">
          {contenido.rating && contenido.rating !== 'N/A' && (
            <span className="tarjeta-rating">
              <Star size={12} fill="currentColor" />
              {contenido.rating}
            </span>
          )}
        </div>
      </div>

      <div className="tarjeta-info">
        <h3 className="tarjeta-titulo">{contenido.titulo}</h3>
        {contenido.anio && <span className="tarjeta-anio">{contenido.anio}</span>}
      </div>
    </article>
  );
}
