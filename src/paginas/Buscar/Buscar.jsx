import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Sparkles, Loader } from 'lucide-react';
import TarjetaContenido from '../../componentes/TarjetaContenido/TarjetaContenido';
import SkeletonTarjeta from '../../componentes/SkeletonTarjeta/SkeletonTarjeta';
import PanelDetalle from '../../componentes/PanelDetalle/PanelDetalle';
import { analizarTextoConIA } from '../../servicios/servicioIA';
import { buscarPorGeneros, buscarPorTexto, obtenerDetalles, obtenerSimilares } from '../../servicios/servicioTMDB';
import { buscarAnimePorGeneros, buscarAnimePorTexto, obtenerDetallesAnime, obtenerRecomendacionesAnime } from '../../servicios/servicioJikan';
import { useStore } from '../../estado/useStore';
import { useDebounce } from '../../hooks/useHooks';
import './Buscar.css';

export default function Buscar() {
  const [searchParams] = useSearchParams();
  const [consulta, setConsulta] = useState(searchParams.get('q') || '');
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todo');
  const [detalleActual, setDetalleActual] = useState(null);
  const [similares, setSimilares] = useState([]);
  const [analisisIA, setAnalisisIA] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [idReferenciaActual, setIdReferenciaActual] = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const { usuario, guardarBusqueda } = useStore();
  const itemsPorPagina = 20;

  const consultaDebounce = useDebounce(consulta, 1500);

  useEffect(() => {
    if (consultaDebounce.trim().length >= 3) {
      realizarBusqueda(consultaDebounce);
    }
  }, [consultaDebounce]);

  // Si viene con param q
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setConsulta(q);
    }
  }, [searchParams]);

  async function realizarBusqueda(texto) {
    const startTime = Date.now();
    setCargando(true);
    setAnalizando(true);
    setAnalisisIA(null);
    setPagina(1);

    try {
      // Paso 1: Analizar con IA
      const analisis = await analizarTextoConIA(texto);
      setAnalisisIA(analisis);
      setAnalizando(false);

      // Paso 2: Guardar en historial si está logueado
      if (usuario) {
        guardarBusqueda(texto);
      }

      // Paso 3: Buscar contenido según el análisis
      let resultadosNuevos = [];
      let idReferencia = null;

      // NUEVO: Buscar los títulos específicos recomendados por la IA
      if (analisis.titulos_recomendados && analisis.titulos_recomendados.length > 0) {
        console.log('Buscando títulos recomendados por la IA:', analisis.titulos_recomendados);
        
        const promesas = analisis.titulos_recomendados.map(async (titulo) => {
          try {
            if (analisis.tipo === 'anime') {
              const res = await buscarAnimePorTexto(titulo);
              return res.length > 0 ? res[0] : null;
            } else {
              const res = await buscarPorTexto(titulo, analisis.tipo);
              return res.length > 0 ? res[0] : null;
            }
          } catch (e) {
            return null;
          }
        });
        
        const itemsRecomendados = (await Promise.all(promesas)).filter(Boolean);
        
        let extras = [];
        
        // Detección local súper robusta del título base (por si la IA pequeña olvida parsearlo en el JSON)
        let tituloReferenciaLocal = null;
        const textoBusqueda = texto.toLowerCase();
        const matchComo = textoBusqueda.match(/(?:como|parecid[oa]s? a|similar a|parecido? a|estilo)\s+([^,.]+)/);
        if (matchComo) {
          tituloReferenciaLocal = matchComo[1].trim();
        }
        
        const referenciaFinal = analisis.titulo_referencia || tituloReferenciaLocal;

        // Determinar de qué obra vamos a sacar los "similares" de relleno
        if (referenciaFinal) {
          console.log('Fijando título de referencia estricto:', referenciaFinal);
          const resRef = analisis.tipo === 'anime' 
            ? await buscarAnimePorTexto(referenciaFinal)
            : await buscarPorTexto(referenciaFinal, analisis.tipo);
          
          if (resRef.length > 0) idReferencia = resRef[0].id;
        }

        // Si no hubo título de referencia explícito, usar la primera recomendación de la IA
        if (!idReferencia && itemsRecomendados.length > 0) {
          idReferencia = itemsRecomendados[0].id;
        }

        // Rellenar con sugerencias similares oficiales de TMDB (esto asegura que vengan secuelas y spin-offs directamente amarrados)
        if (idReferencia) {
          if (analisis.tipo === 'anime') {
            extras = await obtenerRecomendacionesAnime(idReferencia);
          } else {
            extras = await obtenerSimilares(idReferencia, analisis.tipo);
          }
          // Marcar los extras como protegidos para que no sean borrados si tienen rating 0.0 (ej: Ballerina que no ha salido)
          extras = extras.map(e => ({ ...e, esSugerenciaOficialTMDB: true }));
        }
        
        const mapa = new Map();
        [...itemsRecomendados, ...extras].forEach(r => mapa.set(`${r.tipo}-${r.id}`, r));
        resultadosNuevos = Array.from(mapa.values());
        
      } else if (analisis.titulo_referencia) {
        console.log('Buscando similitudes para:', analisis.titulo_referencia);
        let obraReferencia = null;
        
        if (analisis.tipo === 'anime') {
          const res = await buscarAnimePorTexto(analisis.titulo_referencia);
          if (res.length > 0) obraReferencia = res[0];
          if (obraReferencia) {
            resultadosNuevos = await obtenerRecomendacionesAnime(obraReferencia.id);
          }
        } else {
          const res = await buscarPorTexto(analisis.titulo_referencia, analisis.tipo);
          if (res.length > 0) obraReferencia = res[0];
          if (obraReferencia) {
            idReferencia = obraReferencia.id;
            resultadosNuevos = await obtenerSimilares(obraReferencia.id, analisis.tipo);
          }
        }
        resultadosNuevos = resultadosNuevos.map(e => ({ ...e, esSugerenciaOficialTMDB: true }));
      }

      // Si no hay títulos de recomendación o similares, buscar por géneros/texto
      if (resultadosNuevos.length === 0) {
        if (analisis.tipo === 'anime') {
          const busquedaTexto = analisis.palabras_clave.join(' ') || texto;
          const promesas = [buscarAnimePorTexto(busquedaTexto)];
          if (analisis.generos.length > 0) promesas.push(buscarAnimePorGeneros(analisis.generos));
          
          const [porTexto, porGenero = []] = await Promise.all(promesas);
          const mapa = new Map();
          [...porTexto, ...porGenero].forEach(r => mapa.set(`${r.tipo}-${r.id}`, r));
          resultadosNuevos = Array.from(mapa.values());
        } else {
          const tipo = analisis.tipo;
          const busquedaTexto = analisis.palabras_clave.join(' ') || texto;
          const promesas = [buscarPorTexto(busquedaTexto, tipo)];
          if (analisis.generos.length > 0) promesas.push(buscarPorGeneros(tipo, analisis.generos));

          const [porTexto, porGenero = []] = await Promise.all(promesas);
          const mapa = new Map();
          [...porTexto, ...porGenero].forEach(r => mapa.set(`${r.tipo}-${r.id}`, r));
          resultadosNuevos = Array.from(mapa.values());
        }
      }

      // Filtrar resultados sin rating (0.0) que suelen ser relleno irrelevante de TMDB
      // Excepción: NUNCA filtramos los títulos que la IA recomendó explícitamente ni los similares forzados de TMDB
      const titulosRecomendados = new Set((analisis.titulos_recomendados || []).map(t => t.toLowerCase()));
      
      resultadosNuevos = resultadosNuevos.filter(r => {
        const esRecomendadoPorIA = [...titulosRecomendados].some(tituloIA => 
          tituloIA.includes(r.titulo.toLowerCase()) || r.titulo.toLowerCase().includes(tituloIA)
        );
        
        if (esRecomendadoPorIA || r.esSugerenciaOficialTMDB) return true;
        
        const rating = parseFloat(r.rating);
        return !isNaN(rating) && rating > 0;
      });

      // Ordenar resultados de más recientes a más antiguos (por año)
      resultadosNuevos.sort((a, b) => {
        const yearA = parseInt(a.anio) || 0;
        const yearB = parseInt(b.anio) || 0;
        return yearB - yearA;
      });

      // Guardar el ID de referencia para paginación inteligente si aplica
      setIdReferenciaActual(idReferencia);

      // ESPERA MINIMA (800ms) para que el Shimmer de la IA se luzca
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        setResultados(resultadosNuevos);
        setCargando(false);
        setAnalizando(false);
      }, waitTime);

    } catch (error) {
      console.error('Error en búsqueda:', error);
      setCargando(false);
      setAnalizando(false);
    }
  }

  async function cargarMas() {
    console.log('--- Intentando Cargar Más ---');
    if (cargandoMas || !analisisIA) {
      console.log('Cancelado:', cargandoMas ? 'Cargando actualmente' : 'No hay análisis IA');
      return;
    }
    
    const startTime = Date.now();
    setCargandoMas(true);
    const siguientePagina = pagina + 1;
    console.log(`Cargando página ${siguientePagina} para el modo: ${idReferenciaActual ? 'Similitud' : 'Descubrimiento'}`);

    try {
      let nuevos = [];
      
      // MODO 1: Persistencia de Similitud (idReferenciaActual)
      if (idReferenciaActual) {
        if (analisisIA.tipo === 'anime') {
          if (analisisIA.generos.length > 0) {
            nuevos = await buscarAnimePorGeneros(analisisIA.generos, siguientePagina);
          }
        } else {
          nuevos = await obtenerSimilares(idReferenciaActual, analisisIA.tipo, siguientePagina);
        }
      } 
      // MODO 2: Descubrimiento Inteligente (Generos / Keywords)
      else {
        const busquedaTexto = analisisIA.palabras_clave.join(' ') || consulta;
        if (analisisIA.tipo === 'anime') {
          if (analisisIA.generos.length > 0) {
            nuevos = await buscarAnimePorGeneros(analisisIA.generos, siguientePagina);
          } else {
            nuevos = await buscarAnimePorTexto(busquedaTexto, siguientePagina);
          }
        } else {
          if (analisisIA.generos.length > 0) {
            nuevos = await buscarPorGeneros(analisisIA.tipo, analisisIA.generos, siguientePagina);
          } else {
            nuevos = await buscarPorTexto(busquedaTexto, analisisIA.tipo, siguientePagina);
          }
        }
      }

      console.log(`Recibidos ${nuevos.length} resultados de la API`);

      // 1. Filtrar por calidad inmediatamente
      const calificados = nuevos.filter(r => {
        const rating = parseFloat(r.rating);
        return !isNaN(rating) && rating > 0;
      });

      // 2. UNION ABSOLUTA: Usamos un Map para garantizar unicidad total (Prev + Nuevos)
      const mapaTotal = new Map();
      resultados.forEach(r => mapaTotal.set(`${r.tipo}-${r.id}`, r));
      calificados.forEach(r => {
        const key = `${r.tipo}-${r.id}`;
        if (!mapaTotal.has(key)) mapaTotal.set(key, r);
      });

      const listaFinal = Array.from(mapaTotal.values());
      const cantidadNuevos = listaFinal.length - resultados.length;

      console.log(`${cantidadNuevos} resultados realmente nuevos añadidos.`);

      // CALCULAR ESPERA MINIMA (800ms) para que el shimmer se vea de lujo
      const elapsed = Date.now() - startTime;
      const waitTime = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        if (cantidadNuevos > 0) {
          setResultados(listaFinal);
        }
        setPagina(siguientePagina);
        setCargandoMas(false);
      }, waitTime);
      
    } catch (error) {
      console.error('Error al cargar más:', error);
      setCargandoMas(false);
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

  const resultadosFiltrados = filtroTipo === 'todo'
    ? resultados
    : resultados.filter(r => r.tipo === filtroTipo);

  // Ya no necesitamos resultadosPaginados (slice) porque cargamos de verdad desde la API
  const resultadosParaMostrar = resultadosFiltrados;

  return (
    <div className="buscar-pagina contenedor">
      {/* Barra de búsqueda */}
      <div className="buscar-header animar-aparecer">
        <h1 className="buscar-titulo">
          <Sparkles size={24} className="buscar-titulo-icono" />
          Búsqueda Inteligente
        </h1>

        <div className="buscar-input-wrapper">
          <Search size={20} className="buscar-input-icono" />
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder='Pregunta: recomiendame peliculas como...'
            className="buscar-input"
            autoFocus
          />
          {analizando && (
            <div className="buscar-analizando">
              <Loader size={16} className="buscar-loader" />
              Analizando...
            </div>
          )}
        </div>

        {/* Análisis IA resultado */}
        {analisisIA && (
          <>
            <div className="buscar-analisis animar-aparecer">
              <span className="buscar-analisis-label">IA detectó:</span>
              <span className="etiqueta">{analisisIA.tipo}</span>
              {analisisIA.titulo_referencia && (
                <span className="etiqueta" style={{ borderColor: 'var(--acento-primario)', color: 'var(--acento-hover)' }}>
                  ✨ Similar a: {analisisIA.titulo_referencia}
                </span>
              )}
              {analisisIA.generos.map(g => (
                <span key={g} className="etiqueta">{g}</span>
              ))}
            </div>
            {analisisIA.mensaje && (
              <div className="buscar-mensaje-ia animar-aparecer">
                <Sparkles size={18} className="buscar-mensaje-ia-icono" />
                <p>{analisisIA.mensaje}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filtros de tipo */}
      {resultados.length > 0 && (
        <div className="buscar-filtros">
          {['todo', 'pelicula', 'serie', 'anime'].map(t => (
            <button
              key={t}
              className={`buscar-filtro ${filtroTipo === t ? 'activo' : ''}`}
              onClick={() => { setFiltroTipo(t); setPagina(1); }}
            >
              {t === 'todo' ? 'Todo' : t === 'pelicula' ? 'Movies' : t === 'serie' ? 'TV Shows' : 'Anime'}
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      <div className={`buscar-layout ${detalleActual ? 'con-detalle' : ''}`}>
        <div className="buscar-resultados">
          {consultaDebounce && resultados.length > 0 && (
            <h2 className="buscar-resultados-titulo">
              {analisisIA?.titulo_referencia ? (
                <>Recomendaciones similares a "<em>{analisisIA.titulo_referencia}</em>"</>
              ) : (
                <>Resultados para "<em>{consultaDebounce}</em>"</>
              )}
            </h2>
          )}

          {(cargando || analizando) ? (
            <div className="grid-contenido">
              {[...Array(10)].map((_, i) => (
                <SkeletonTarjeta key={i} />
              ))}
            </div>
          ) : resultadosParaMostrar.length > 0 ? (
            <div className="buscar-resultados-bloque">
              {/* Contenedor de la cuadrícula estable */}
              <div className="grid-contenido">
                {resultadosParaMostrar.map((item, i) => (
                  <TarjetaContenido
                    key={`${item.tipo}-${item.id}`}
                    contenido={item}
                    onClick={abrirDetalle}
                    indice={i}
                  />
                ))}
                
                {/* Skeletons adicionales al cargar más: 8 para llenar la vista */}
                {cargandoMas && [...Array(8)].map((_, i) => (
                  <SkeletonTarjeta key={`skeleton-mas-${pagina}-${i}`} />
                ))}
              </div>
              
              <div className="buscar-ver-mas-contenedor">
                <button 
                  className="boton-secundario" 
                  onClick={cargarMas}
                  disabled={cargandoMas}
                  style={{ minWidth: '180px', position: 'relative' }}
                >
                  {/* LOGICA ESTATICA: Los elementos SIEMPRE existen para evitar errores de reconciliación */}
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    opacity: cargandoMas ? 0.7 : 1,
                    transition: 'opacity 0.2s'
                  }}>
                    <Loader 
                      size={16} 
                      className="spinner-mini" 
                      style={{ 
                        visibility: cargandoMas ? 'visible' : 'hidden',
                        opacity: cargandoMas ? 1 : 0
                      }} 
                    />
                    <span>{cargandoMas ? 'Cargando más...' : 'Ver más resultados'}</span>
                  </span>
                </button>
              </div>
            </div>
          ) : consultaDebounce.trim().length >= 3 && !cargando ? (
            <div className="mensaje-vacio">
              <h3>No se encontraron resultados</h3>
              <p>Intenta con una descripción diferente o más específica</p>
            </div>
          ) : (
            <div className="mensaje-vacio">
              <Sparkles size={40} style={{ marginBottom: 16, color: 'var(--acento-primario)' }} />
              <h3>¿Qué te gustaría ver?</h3>
              <p>Escribe una descripción, un género o el nombre de algo que te gustó</p>
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
    </div>
  );
}
