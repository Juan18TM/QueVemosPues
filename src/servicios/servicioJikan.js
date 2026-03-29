import axios from 'axios';

const BASE_URL = 'https://api.jikan.moe/v4';

const jikan = axios.create({ baseURL: BASE_URL });

// Rate limiting - Jikan permite ~3 requests/segundo
let proximaPeticionDisponible = Date.now();

async function esperarRateLimit() {
  const ahora = Date.now();
  if (proximaPeticionDisponible > ahora) {
    const tiempoEspera = proximaPeticionDisponible - ahora;
    proximaPeticionDisponible += 800; // Bloqueo de 800ms para seguridad extra
    await new Promise(r => setTimeout(r, Math.max(0, tiempoEspera)));
  } else {
    proximaPeticionDisponible = ahora + 800;
  }
}

// Función helper para interceptar errores 429 y reintentarlos automáticamente
async function fetchConReintento(url, config, reintentos = 2) {
  try {
    return await jikan.get(url, config);
  } catch (error) {
    if (error.response?.status === 429 && reintentos > 0) {
      console.warn('Jikan Rate Limit (429) alcanzado. Esperando 2 segundos para reintentar...');
      await new Promise(r => setTimeout(r, 2000));
      return fetchConReintento(url, config, reintentos - 1);
    }
    throw error;
  }
}

const MAPA_GENEROS = {
  action: 1, adventure: 2, comedy: 4, drama: 8,
  fantasy: 10, horror: 14, mystery: 7, romance: 22,
  'sci-fi': 24, thriller: 41, slice_of_life: 36,
  sports: 30, supernatural: 37, mecha: 18
};

export async function buscarAnimePorGeneros(generos, pagina = 1) {
  await esperarRateLimit();

  const generoIds = generos
    .map(g => MAPA_GENEROS[g.toLowerCase()])
    .filter(Boolean)
    .join(',');

  try {
    const { data } = await fetchConReintento('/anime', {
      params: {
        genres: generoIds || undefined,
        order_by: 'score',
        sort: 'desc',
        page: pagina,
        limit: 20,
        sfw: true
      }
    });

    return data.data.map(formatearAnime);
  } catch (error) {
    console.error('Error Jikan búsqueda por géneros:', error);
    return [];
  }
}

export async function buscarAnimePorTexto(consulta, pagina = 1) {
  await esperarRateLimit();

  try {
    const { data } = await fetchConReintento('/anime', {
      params: {
        q: consulta,
        page: pagina,
        limit: 20,
        sfw: true
      }
    });

    return data.data.map(formatearAnime);
  } catch (error) {
    console.error('Error Jikan búsqueda por texto:', error);
    return [];
  }
}

export async function obtenerRecomendacionesAnime(id) {
  await esperarRateLimit();

  try {
    const { data } = await fetchConReintento(`/anime/${id}/recommendations`);
    return data.data.slice(0, 10).map(rec => formatearAnime(rec.entry));
  } catch (error) {
    console.error('Error Jikan recomendaciones:', error);
    return [];
  }
}

export async function obtenerTopAnime(filtro = 'bypopularity', pagina = 1) {
  await esperarRateLimit();

  try {
    const { data } = await fetchConReintento('/top/anime', {
      params: {
        filter: filtro,
        page: pagina,
        limit: 10,
        sfw: true
      }
    });

    return data.data.map(formatearAnime);
  } catch (error) {
    console.error('Error Jikan top anime:', error);
    return [];
  }
}

export async function obtenerDetallesAnime(id) {
  await esperarRateLimit();

  try {
    const { data } = await jikan.get(`/anime/${id}/full`);
    const anime = data.data;

    return {
      id: anime.mal_id.toString(),
      titulo: anime.title,
      descripcion: anime.synopsis || 'Sin sinopsis disponible.',
      imagen: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
      fondo: anime.images?.jpg?.large_image_url || null,
      tipo: 'anime',
      rating: anime.score?.toFixed(1) || 'N/A',
      anio: anime.year?.toString() || anime.aired?.from?.substring(0, 4) || '',
      duracion: anime.episodes ? `${anime.episodes} ep.` : anime.duration || '',
      generos: anime.genres?.map(g => g.name) || []
    };
  } catch (error) {
    console.error('Error Jikan detalles:', error);
    return null;
  }
}

export async function obtenerProveedoresAnime(id) {
  await esperarRateLimit();
  try {
    const { data } = await fetchConReintento(`/anime/${id}/streaming`);
    
    // Diccionario de logos conocidos para plataformas de anime usando SimpleIcons (SVG fijos y estables con colores de marca oficiales)
    const LOGOS_CONOCIDOS = {
      'Crunchyroll': 'https://cdn.simpleicons.org/crunchyroll/F47521',
      'Netflix': 'https://cdn.simpleicons.org/netflix/E50914',
      'Amazon Prime Video': 'https://cdn.simpleicons.org/primevideo/00A8E1',
      'Prime Video': 'https://cdn.simpleicons.org/primevideo/00A8E1',
      'Hulu': 'https://cdn.simpleicons.org/hulu/1CE783',
      'Funimation': 'https://cdn.simpleicons.org/funimation/5A2EE2',
      'Disney+': 'https://cdn.simpleicons.org/disney/113CCF',
      'Disney Plus': 'https://cdn.simpleicons.org/disney/113CCF',
      'HBO Max': 'https://cdn.simpleicons.org/hbo/000000',
      'Max': 'https://cdn.simpleicons.org/max/002BE7',
      'Bilibili': 'https://cdn.simpleicons.org/bilibili/00A1D6'
    };

    const plataformas = (data?.data || []).map(p => ({
      nombre: p.name,
      link: p.url,
      logo: LOGOS_CONOCIDOS[p.name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=92`
    }));

    // Filtramos duplicados por nombre
    const unicas = plataformas.filter((p, index, self) =>
      index === self.findIndex((t) => t.nombre === p.nombre)
    );

    return { 
      plataformas: unicas,
      link: null
    };
  } catch (error) {
    console.warn('Error Jikan proveedores:', error.message);
    return { plataformas: [], link: null };
  }
}

function formatearAnime(anime) {
  return {
    id: (anime.mal_id || anime.id)?.toString(),
    titulo: anime.title,
    descripcion: anime.synopsis || 'Sin sinopsis disponible.',
    imagen: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
    tipo: 'anime',
    rating: anime.score?.toFixed(1) || 'N/A',
    anio: anime.year?.toString() || ''
  };
}
