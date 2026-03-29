import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, Film, Tv, Zap, Star, TrendingUp } from 'lucide-react';
import TarjetaContenido from '../../componentes/TarjetaContenido/TarjetaContenido';
import PanelDetalle from '../../componentes/PanelDetalle/PanelDetalle';
import { obtenerTendencias, buscarPorGeneros, obtenerDetalles, obtenerSimilares, obtenerPopulares } from '../../servicios/servicioTMDB';
import { obtenerTopAnime, obtenerDetallesAnime, obtenerRecomendacionesAnime, buscarAnimePorGeneros, obtenerAnimePorTipo } from '../../servicios/servicioJikan';
import { useStore } from '../../estado/useStore';
import './Inicio.css';

export default function Inicio() {
  const [searchParams] = useSearchParams();
  const tipoActual = searchParams.get('tipo') || 'pelicula';
  const { usuario } = useStore();
  const contentRef = useRef(null);
  
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMasId, setCargandoMasId] = useState(null);
  const [detalleActual, setDetalleActual] = useState(null);
  const [similares, setSimilares] = useState([]);

  const scrollDown = () => {
    const el = document.getElementById('contenido-principal');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    cargarContenido();
    // Si hay un tipo en la URL, hacemos scroll inicial
    if (searchParams.get('tipo')) {
      setTimeout(() => {
        const el = document.getElementById('contenido-principal');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300); // Un poco más de tiempo para asegurar carga inicial
    }
  }, [searchParams]); // Dependencia en searchParams completa para detectar cambios /? -> /?tipo=pelicula

  async function cargarContenido() {
    setCargando(true);
    setSecciones([]);
    
    try {
      if (tipoActual === 'anime') {
        const [popular, favorite, movies, action, fantasy, romance] = await Promise.all([
          obtenerTopAnime('bypopularity', 1),
          obtenerTopAnime('favorite', 1),
          obtenerAnimePorTipo('movie', 1),
          buscarAnimePorGeneros(['action']), 
          buscarAnimePorGeneros(['fantasy']), 
          buscarAnimePorGeneros(['romance'])
        ]);
        
        setSecciones([
          { id: 'popular', titulo: 'Anime Popular', subtitulo: 'Lo que todos están viendo', items: popular, pagina: 1, tipoAccion: 'anime_top', param: 'bypopularity' },
          { id: 'movies', titulo: 'Películas de Anime', subtitulo: 'Grandes historias en cine', items: movies, pagina: 1, tipoAccion: 'anime_tipo', param: 'movie' },
          { id: 'favorite', titulo: 'Favoritos de la Comunidad', subtitulo: 'Los más amados', items: favorite, pagina: 1, tipoAccion: 'anime_top', param: 'favorite' },
          { id: 'action', titulo: 'Acción y Shonen', subtitulo: 'Adrenalina pura', items: action, pagina: 1, tipoAccion: 'anime_genero', param: ['action'] },
          { id: 'fantasy', titulo: 'Fantasía y Magia', subtitulo: 'Mundos paralelos', items: fantasy, pagina: 1, tipoAccion: 'anime_genero', param: ['fantasy'] },
          { id: 'romance', titulo: 'Romance y Recuentos de la Vida', subtitulo: 'Historias del corazón', items: romance, pagina: 1, tipoAccion: 'anime_genero', param: ['romance'] }
        ]);
      } else if (tipoActual === 'serie') {
        const [trending, popular, drama, scifi, mystery] = await Promise.all([
          obtenerTendencias('serie'),
          obtenerPopulares('serie'),
          buscarPorGeneros('serie', ['drama']),
          buscarPorGeneros('serie', ['fantasy']),
          buscarPorGeneros('serie', ['mystery'])
        ]);
        
        setSecciones([
          { id: 'trending', titulo: 'Tendencias en Series', subtitulo: 'Novedades semanales', items: trending, pagina: 1, tipoAccion: 'trending', param: 'serie' },
          { id: 'popular', titulo: 'Series Populares', subtitulo: 'Lo que todos están viendo', items: popular, pagina: 1, tipoAccion: 'popular', param: 'serie' },
          { id: 'drama', titulo: 'Series de Drama', subtitulo: 'Historias intensas', items: drama, pagina: 1, tipoAccion: 'genero', param: ['drama'] },
          { id: 'scifi', titulo: 'Ciencia Ficción y Fantasía', subtitulo: 'Explora lo desconocido', items: scifi, pagina: 1, tipoAccion: 'genero', param: ['fantasy'] },
          { id: 'mystery', titulo: 'Misterio y Suspenso', subtitulo: '¿Qué pasará después?', items: mystery, pagina: 1, tipoAccion: 'genero', param: ['mystery'] }
        ]);
      } else {
        const [trending, popular, action, horror, comedy] = await Promise.all([
          obtenerTendencias('pelicula'),
          obtenerPopulares('pelicula'),
          buscarPorGeneros('pelicula', ['action']),
          buscarPorGeneros('pelicula', ['horror']),
          buscarPorGeneros('pelicula', ['comedy'])
        ]);
        
        setSecciones([
          { id: 'trending', titulo: 'Tendencias en Cine', subtitulo: 'Películas destacadas', items: trending, pagina: 1, tipoAccion: 'trending', param: 'pelicula' },
          { id: 'popular', titulo: 'Cine Popular', subtitulo: 'Las favoritas del público', items: popular, pagina: 1, tipoAccion: 'popular', param: 'pelicula' },
          { id: 'action', titulo: 'Acción y Aventura', subtitulo: 'Mucha adrenalina', items: action, pagina: 1, tipoAccion: 'genero', param: ['action'] },
          { id: 'horror', titulo: 'Terror y Suspenso', subtitulo: 'Noche de sustos', items: horror, pagina: 1, tipoAccion: 'genero', param: ['horror'] },
          { id: 'comedy', titulo: 'Comedias', subtitulo: 'Diversión asegurada', items: comedy, pagina: 1, tipoAccion: 'genero', param: ['comedy'] }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }

  async function cargarMasSeccion(id) {
    const seccion = secciones.find(s => s.id === id);
    if (!seccion || cargandoMasId) return;

    setCargandoMasId(id);
    const siguientePagina = seccion.pagina + 1;

    try {
      let nuevos = [];
      switch (seccion.tipoAccion) {
        case 'popular':
          nuevos = await obtenerPopulares(seccion.param, siguientePagina);
          break;
        case 'genero':
          nuevos = await buscarPorGeneros(tipoActual, seccion.param, siguientePagina);
          break;
        case 'anime_top':
          nuevos = await obtenerTopAnime(seccion.param, siguientePagina);
          break;
        case 'anime_tipo':
          nuevos = await obtenerAnimePorTipo(seccion.param, siguientePagina);
          break;
        case 'anime_genero':
          nuevos = await buscarAnimePorGeneros(seccion.param, siguientePagina);
          break;
        default:
          nuevos = [];
      }

      if (nuevos.length > 0) {
        setSecciones(prev => prev.map(s => 
          s.id === id 
            ? { ...s, items: [...s.items, ...nuevos], pagina: siguientePagina }
            : s
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoMasId(null);
    }
  }

  async function abrirDetalle(contenido) {
    try {
      let detalle, sims;
      if (contenido.tipo === 'anime') {
        [detalle, sims] = await Promise.all([
          obtenerDetallesAnime(contenido.id),
          obtenerRecomendacionesAnime(contenido.id)
        ]);
      } else {
        [detalle, sims] = await Promise.all([
          obtenerDetalles(contenido.id, contenido.tipo),
          obtenerSimilares(contenido.id, contenido.tipo)
        ]);
      }
      setDetalleActual(detalle);
      setSimilares(sims);
    } catch (err) {
      console.error(err);
    }
  }

  const sugerencias = ['Sci-Fi épico', 'Comedia romántica', 'Misterio', 'Anime de acción'];

  return (
    <div className="inicio">
      {/* Hero */}
      <section className="hero">
        <div className="hero-gradiente" />
        <div className="contenedor hero-contenido">
          <span className="hero-badge">
            <Sparkles size={14} /> AI-POWERED SELECTION
          </span>
          <h1 className="hero-titulo">
            Tu próximo favorito,<br />
            <span className="hero-titulo-acento">descubierto por IA.</span>
          </h1>
          <p className="hero-subtitulo">
            Explora el universo cinematográfico con recomendaciones inteligentes
            que entienden tu estado de ánimo.
          </p>

          <Link to="/buscar" className="hero-buscador">
            <Search size={18} className="hero-buscador-icono" />
            <span className="hero-buscador-placeholder">
              Pregunta: "Recomiendame películas como..." o "Animes de..."
            </span>
            <span className="hero-buscador-boton">
              <Sparkles size={14} /> Magic
            </span>
          </Link>

          <div className="hero-sugerencias">
            <span className="hero-sugerencias-label">Recientes:</span>
            {sugerencias.map(s => (
              <Link key={s} to={`/buscar?q=${encodeURIComponent(s)}`} className="hero-sugerencia-tag">
                {s}
              </Link>
            ))}
          </div>

          <div className="hero-categorias">
            <Link to="/?tipo=pelicula" className="hero-categoria" onClick={scrollDown}>
              <div className="hero-categoria-icono"><Film size={24} /></div>
              <span>MOVIES</span>
            </Link>
            <Link to="/?tipo=serie" className="hero-categoria" onClick={scrollDown}>
              <div className="hero-categoria-icono"><Tv size={24} /></div>
              <span>SERIES</span>
            </Link>
            <Link to="/?tipo=anime" className="hero-categoria" onClick={scrollDown}>
              <div className="hero-categoria-icono"><Zap size={24} /></div>
              <span>ANIME</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <div id="contenido-principal" className="inicio-body contenedor" ref={contentRef}>
        <div className={`inicio-layout ${detalleActual ? 'con-detalle' : ''}`}>
          <div className="inicio-principal">
            {cargando ? (
              <div className="spinner-contenedor"><div className="spinner" /></div>
            ) : (
              secciones.map((seccion) => (
                <section key={seccion.id} className="seccion-contenido">
                  <div className="seccion-header">
                    <div>
                      <h2 className="seccion-titulo">{seccion.titulo}</h2>
                      <p className="seccion-subtitulo">{seccion.subtitulo}</p>
                    </div>
                  </div>

                  <div className="grid-contenido animar-escalonado">
                    {seccion.items.map((item, i) => (
                      <TarjetaContenido
                        key={`${seccion.id}-${item.id}`}
                        contenido={item}
                        onClick={abrirDetalle}
                        indice={i}
                      />
                    ))}
                  </div>

                  {/* Botón Ver Más Local */}
                  {seccion.items.length >= 10 && seccion.tipoAccion !== 'trending' && (
                    <div className="seccion-footer-vermas">
                      <button 
                        className="boton-vermas-lineal"
                        onClick={() => cargarMasSeccion(seccion.id)}
                        disabled={cargandoMasId === seccion.id}
                      >
                        {cargandoMasId === seccion.id ? (
                          <div className="spinner-mini" />
                        ) : (
                          <>Cargar más en {seccion.titulo}</>
                        )}
                      </button>
                    </div>
                  )}
                </section>
              ))
            )}

            {/* CTA */}
            <section className="cta-seccion" key={usuario ? 'cta-in' : 'cta-out'}>
              <div className="cta-contenido">
                <h2 className="cta-titulo">¿No sabes qué ver hoy?</h2>
                <p className="cta-texto">
                  {usuario
                    ? 'Deja que nuestra IA te recomiende algo perfecto para tu estado de ánimo.'
                    : 'Únete a miles de cinéfilos y deja que nuestra IA cure tu fin de semana. Crea listas personalizadas y nunca te pierdas un estreno.'
                  }
                </p>
                <div className="cta-botones">
                  <Link to={usuario ? '/buscar' : '/registro'} className="boton-primario">
                    {usuario ? 'Buscar con IA' : 'Crear Cuenta Gratis'}
                  </Link>
                  <Link to={usuario ? '/favoritos' : '/buscar'} className="boton-secundario">
                    {usuario ? 'Mis Favoritos' : 'Explorar como Invitado'}
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* Panel de detalle */}
          {detalleActual && (
            <PanelDetalle
              detalle={detalleActual}
              similares={similares}
              onClose={() => { setDetalleActual(null); setSimilares([]); }}
              onClickSimilar={abrirDetalle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
