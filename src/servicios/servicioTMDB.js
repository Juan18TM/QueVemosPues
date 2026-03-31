import axios from 'axios';

const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
export const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'es-ES'
  }
});

// Mapa de nombres de géneros a IDs de TMDB
const GENEROS_PELICULA = {
  action: 28, adventure: 12, comedy: 35, drama: 18,
  fantasy: 14, horror: 27, mystery: 9648, romance: 10749,
  'sci-fi': 878, thriller: 53, animation: 16, war: 10752, history: 36
};

const GENEROS_SERIE = {
  action: 10759, adventure: 10759, comedy: 35, drama: 18,
  fantasy: 10765, horror: 9648, mystery: 9648, romance: 10749,
  'sci-fi': 10765, thriller: 9648, animation: 16, war: 10768
};

export async function buscarPorGeneros(tipo, generos, pagina = 1) {
  const mapaGeneros = tipo === 'pelicula' ? GENEROS_PELICULA : GENEROS_SERIE;
  const generoIds = generos
    .map(g => mapaGeneros[g.toLowerCase()])
    .filter(Boolean)
    .join(',');

  const endpoint = tipo === 'pelicula' ? '/discover/movie' : '/discover/tv';

  try {
    const { data } = await tmdb.get(endpoint, {
      params: {
        with_genres: generoIds || undefined,
        sort_by: 'popularity.desc',
        page: pagina
      }
    });

    return data.results.map(item => formatearResultado(item, tipo));
  } catch (error) {
    console.error('Error TMDB búsqueda por géneros:', error);
    return [];
  }
}

export async function buscarPorTexto(consulta, tipo = 'pelicula', pagina = 1) {
  const endpoint = tipo === 'pelicula' ? '/search/movie' : '/search/tv';

  try {
    const { data } = await tmdb.get(endpoint, {
      params: { query: consulta, page: pagina }
    });

    return data.results.map(item => formatearResultado(item, tipo));
  } catch (error) {
    console.error('Error TMDB búsqueda por texto:', error);
    return [];
  }
}

export async function obtenerSimilares(id, tipo = 'pelicula', pagina = 1) {
  const mediaType = tipo === 'pelicula' ? 'movie' : 'tv';

  try {
    // Primero obtenemos los géneros del contenido original para poder filtrar
    const detalleOriginal = await tmdb.get(`/${mediaType}/${id}`);
    const generosOriginales = detalleOriginal.data.genres?.map(g => g.id) || [];

    // TMDB /recommendations es más preciso que /similar (usa patrones de visualización reales)
    const [recomendaciones, similares] = await Promise.all([
      tmdb.get(`/${mediaType}/${id}/recommendations`, { params: { page: pagina } })
        .then(r => r.data.results)
        .catch(() => []),
      tmdb.get(`/${mediaType}/${id}/similar`, { params: { page: pagina } })
        .then(r => r.data.results)
        .catch(() => [])
    ]);

    // Combinar y priorizar: primero las recomendaciones (más relevantes), luego similares
    const mapaResultados = new Map();
    [...recomendaciones, ...similares].forEach(item => {
      if (!mapaResultados.has(item.id)) {
        mapaResultados.set(item.id, item);
      }
    });

    let resultados = Array.from(mapaResultados.values());

    // Si tenemos géneros del original, ordenar los que compartan más géneros primero
    if (generosOriginales.length > 0) {
      resultados = resultados.sort((a, b) => {
        const generosA = a.genre_ids || [];
        const generosB = b.genre_ids || [];
        const coincidenciaA = generosA.filter(g => generosOriginales.includes(g)).length;
        const coincidenciaB = generosB.filter(g => generosOriginales.includes(g)).length;
        // Priorizar por coincidencia de géneros, luego por popularidad
        if (coincidenciaB !== coincidenciaA) return coincidenciaB - coincidenciaA;
        return (b.popularity || 0) - (a.popularity || 0);
      });
    }

    return resultados.slice(0, 12).map(item => formatearResultado(item, tipo));
  } catch (error) {
    console.error('Error TMDB similares:', error);
    return [];
  }
}


export async function obtenerTendencias(tipo = 'all') {
  const mediaType = tipo === 'pelicula' ? 'movie' : tipo === 'serie' ? 'tv' : 'all';

  try {
    const { data } = await tmdb.get(`/trending/${mediaType}/week`);
    return data.results.map(item => {
      const itemTipo = item.media_type === 'movie' ? 'pelicula' : 'serie';
      return formatearResultado(item, itemTipo);
    });
  } catch (error) {
    console.error('Error TMDB tendencias:', error);
    return [];
  }
}

export async function obtenerPopulares(tipo = 'pelicula', pagina = 1) {
  const endpoint = tipo === 'pelicula' ? '/movie/popular' : '/tv/popular';

  try {
    const { data } = await tmdb.get(endpoint, {
      params: { page: pagina }
    });
    return data.results.map(item => formatearResultado(item, tipo));
  } catch (error) {
    console.error('Error TMDB populares:', error);
    return [];
  }
}

export async function obtenerDetalles(id, tipo = 'pelicula') {
  const mediaType = tipo === 'pelicula' ? 'movie' : 'tv';

  try {
    const { data } = await tmdb.get(`/${mediaType}/${id}`);
    return {
      id: data.id.toString(),
      titulo: data.title || data.name,
      descripcion: data.overview,
      imagen: data.poster_path ? `${IMG_BASE}${data.poster_path}` : null,
      fondo: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      tipo,
      rating: data.vote_average?.toFixed(1),
      anio: (data.release_date || data.first_air_date || '').substring(0, 4),
      duracion: data.runtime ? `${data.runtime}m` : data.number_of_seasons ? `${data.number_of_seasons} temp.` : '',
      generos: data.genres?.map(g => g.name) || []
    };
  } catch (error) {
    console.error('Error TMDB detalles:', error);
    return null;
  }
}

function formatearResultado(item, tipo) {
  return {
    id: item.id.toString(),
    titulo: item.title || item.name,
    descripcion: item.overview || 'Sin descripción disponible.',
    imagen: item.poster_path ? `${IMG_BASE}${item.poster_path}` : null,
    tipo,
    rating: item.vote_average?.toFixed(1) || 'N/A',
    anio: (item.release_date || item.first_air_date || '').substring(0, 4)
  };
}

export async function obtenerProveedores(id, tipo = 'pelicula') {
  const mediaType = tipo === 'pelicula' ? 'movie' : 'tv';

  try {
    const { data } = await tmdb.get(`/${mediaType}/${id}/watch/providers`);
    // Priorizar Colombia, luego LATAM, luego US
    const region = data.results?.CO || data.results?.MX || data.results?.AR || data.results?.US;
    
    if (!region) return { plataformas: [], link: null };

    const plataformas = (region.flatrate || []).map(p => ({
      nombre: p.provider_name,
      logo: `https://image.tmdb.org/t/p/w92${p.logo_path}`
    }));

    return {
      plataformas,
      link: region.link || null
    };
  } catch (error) {
    console.error('Error TMDB proveedores:', error);
    return { plataformas: [], link: null };
  }
}
