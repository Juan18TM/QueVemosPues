import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, Film, Tv, Zap, Star } from 'lucide-react';
import TarjetaContenido from '../../componentes/TarjetaContenido/TarjetaContenido';
import PanelDetalle from '../../componentes/PanelDetalle/PanelDetalle';
import { obtenerTendencias, buscarPorGeneros, obtenerDetalles, obtenerSimilares } from '../../servicios/servicioTMDB';
import { obtenerTopAnime, obtenerDetallesAnime, obtenerRecomendacionesAnime } from '../../servicios/servicioJikan';
import { useStore } from '../../estado/useStore';
import './Inicio.css';

export default function Inicio() {
  const [searchParams] = useSearchParams();
  const tipoActual = searchParams.get('tipo') || 'pelicula';
  const { usuario } = useStore();
  
  const [seccion1, setSeccion1] = useState([]);
  const [seccion2, setSeccion2] = useState([]);
  const [titulo1, setTitulo1] = useState('Tendencias en Cine');
  const [titulo2, setTitulo2] = useState('Películas de Acción');
  const [cargando, setCargando] = useState(true);
  const [detalleActual, setDetalleActual] = useState(null);
  const [similares, setSimilares] = useState([]);

  useEffect(() => {
    cargarContenido();
  }, [tipoActual]);

  async function cargarContenido() {
    setCargando(true);
    setSeccion1([]);
    setSeccion2([]);
    
    try {
      if (tipoActual === 'anime') {
        setTitulo1('Anime Popular');
        setTitulo2('Anime Favorito');
        const [s1, s2] = await Promise.all([
          obtenerTopAnime('bypopularity', 1),
          obtenerTopAnime('favorite', 1)
        ]);
        setSeccion1(s1);
        setSeccion2(s2);
      } else if (tipoActual === 'serie') {
        setTitulo1('Tendencias en Series');
        setTitulo2('Series de Drama');
        const [s1, s2] = await Promise.all([
          obtenerTendencias('serie'),
          buscarPorGeneros('serie', ['drama'])
        ]);
        setSeccion1(s1);
        setSeccion2(s2);
      } else {
        setTitulo1('Tendencias en Cine');
        setTitulo2('Películas de Acción');
        const [s1, s2] = await Promise.all([
          obtenerTendencias('pelicula'),
          buscarPorGeneros('pelicula', ['action'])
        ]);
        setSeccion1(s1);
        setSeccion2(s2);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
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
              Busca algo como Interstellar o un anime romántico
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
            <Link to="/?tipo=pelicula" className="hero-categoria">
              <div className="hero-categoria-icono"><Film size={24} /></div>
              <span>MOVIES</span>
            </Link>
            <Link to="/?tipo=serie" className="hero-categoria">
              <div className="hero-categoria-icono"><Tv size={24} /></div>
              <span>SERIES</span>
            </Link>
            <Link to="/?tipo=anime" className="hero-categoria">
              <div className="hero-categoria-icono"><Zap size={24} /></div>
              <span>ANIME</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <div className="inicio-body contenedor">
        <div className={`inicio-layout ${detalleActual ? 'con-detalle' : ''}`}>
          <div className="inicio-principal">
            {/* Sección 1 */}
            <section className="seccion-contenido">
              <div className="seccion-header">
                <div>
                  <h2 className="seccion-titulo">{titulo1}</h2>
                  <p className="seccion-subtitulo">Lo más destacado del momento.</p>
                </div>
              </div>

              {cargando ? (
                <div className="spinner-contenedor"><div className="spinner" /></div>
              ) : (
                <div className="grid-contenido animar-escalonado">
                  {seccion1.slice(0, 10).map((item, i) => (
                    <TarjetaContenido
                      key={`s1-${item.id}`}
                      contenido={item}
                      onClick={abrirDetalle}
                      indice={i}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Sección 2 */}
            <section className="seccion-contenido">
              <div className="seccion-header">
                <div>
                  <h2 className="seccion-titulo">{titulo2}</h2>
                  <p className="seccion-subtitulo">Explora más opciones increíbles.</p>
                </div>
              </div>

              {cargando ? (
                <div className="spinner-contenedor"><div className="spinner" /></div>
              ) : (
                <div className="grid-contenido animar-escalonado">
                  {seccion2.slice(0, 10).map((item, i) => (
                    <TarjetaContenido
                      key={`s2-${item.id}`}
                      contenido={item}
                      onClick={abrirDetalle}
                      indice={i}
                    />
                  ))}
                </div>
              )}
            </section>

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
