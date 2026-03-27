import axios from 'axios';

const BASE_URL = 'https://api.jikan.moe/v4';

const jikan = axios.create({ baseURL: BASE_URL });

// Rate limiting - Jikan permite ~3 requests/segundo
let ultimaPeticion = 0;
async function esperarRateLimit() {
  const ahora = Date.now();
  const diferencia = ahora - ultimaPeticion;
  if (diferencia < 400) {
    await new Promise(r => setTimeout(r, 400 - diferencia));
  }
  ultimaPeticion = Date.now();
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
    const { data } = await jikan.get('/anime', {
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
    const { data } = await jikan.get('/anime', {
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
    const { data } = await jikan.get(`/anime/${id}/recommendations`);
    return data.data.slice(0, 10).map(rec => formatearAnime(rec.entry));
  } catch (error) {
    console.error('Error Jikan recomendaciones:', error);
    return [];
  }
}

export async function obtenerTopAnime(filtro = 'bypopularity', pagina = 1) {
  await esperarRateLimit();

  try {
    const { data } = await jikan.get('/top/anime', {
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
