import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Sparkles, Loader } from 'lucide-react';
import TarjetaContenido from '../../componentes/TarjetaContenido/TarjetaContenido';
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
  const { usuario, guardarBusqueda } = useStore();
  const itemsPorPagina = 10;

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
        let idReferencia = null;
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
        [...itemsRecomendados, ...extras].forEach(r => mapa.set(r.id, r));
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
          [...porTexto, ...porGenero].forEach(r => mapa.set(r.id, r));
          resultadosNuevos = Array.from(mapa.values());
        } else {
          const tipo = analisis.tipo;
          const busquedaTexto = analisis.palabras_clave.join(' ') || texto;
          const promesas = [buscarPorTexto(busquedaTexto, tipo)];
          if (analisis.generos.length > 0) promesas.push(buscarPorGeneros(tipo, analisis.generos));

          const [porTexto, porGenero = []] = await Promise.all(promesas);
          const mapa = new Map();
          [...porTexto, ...porGenero].forEach(r => mapa.set(r.id, r));
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

      setResultados(resultadosNuevos);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      setCargando(false);
      setAnalizando(false);
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

  const resultadosPaginados = resultadosFiltrados.slice(0, pagina * itemsPorPagina);

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

          {cargando ? (
            <div className="spinner-contenedor"><div className="spinner" /></div>
          ) : resultadosPaginados.length > 0 ? (
            <>
              <div className="grid-contenido animar-escalonado">
                {resultadosPaginados.map((item, i) => (
                  <TarjetaContenido
                    key={`${item.tipo}-${item.id}`}
                    contenido={item}
                    onClick={abrirDetalle}
                    indice={i}
                  />
                ))}
              </div>
              {resultadosFiltrados.length > pagina * itemsPorPagina && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--espacio-xl)' }}>
                  <button className="boton-secundario" onClick={() => setPagina(p => p + 1)}>
                    Ver más resultados
                  </button>
                </div>
              )}
            </>
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
