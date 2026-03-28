import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODELOS_GRATUITOS = [
  
  'meta-llama/llama-3-8b-instruct',
  'mistralai/mistral-7b-instruct',
  'openchat/openchat-7b',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free'
];

let indiceActual = 0;
const cacheIA = new Map(); // Caché en memoria para evitar llamadas redundantes

/**
 * Analiza el texto del usuario para extraer tipo, géneros, palabras clave y títulos de referencia.
 * Implementa rotación de modelos gratuitos para mitigar errores 429/404 y usa caché en memoria.
 */
export async function analizarTextoConIA(texto, reintentos = 1) {
  const textoLimpio = texto.trim();
  
  // Guarda: No gastar IA en textos muy cortos
  if (textoLimpio.length < 3) {
    return fallbackLocal(textoLimpio);
  }

  // Caché: Retornar resultado memorizado si existe
  if (cacheIA.has(textoLimpio)) {
    console.log('Usando caché de IA para:', textoLimpio);
    return cacheIA.get(textoLimpio);
  }

  if (!API_KEY) {
    console.warn('API Key de OpenRouter no configurada. Usando fallback local.');
    return fallbackLocal(textoLimpio);
  }

  const prompt = `
    Analiza el siguiente texto de un usuario que busca contenido (películas, series o anime) y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura:
    {
      "tipo": "pelicula" | "serie" | "anime",
      "generos": ["Género1", "Género2"],
      "palabras_clave": ["término1", "término2"],
      "titulo_referencia": "Nombre de la obra" | null,
      "mensaje": "Mensaje conversacional recomendando o explicando la sugerencia",
      "titulos_recomendados": ["Titulo 1", "Titulo 2", "Titulo 3", "Titulo 4", "Titulo 5", "Titulo 6", "Titulo 7", "Titulo 8", "Titulo 9", "Titulo 10"]
    }

    Texto del usuario: "${texto}"
    
    Reglas:
    1. "tipo": debe ser "pelicula", "serie" o "anime".
    2. "generos": lista de géneros en español.
    3. "palabras_clave": términos para búsqueda textual.
    4. "titulo_referencia": Si el usuario menciona un título, extrae SOLO el nombre corregido. Si no, null.
    5. "mensaje": Un breve mensaje de IA al usuario. SÚPER IMPORTANTE: NO uses comillas dobles (") dentro del mensaje, si necesitas citar una película usa comillas simples (').
    6. "titulos_recomendados": Un arreglo con exactamente los nombres de 10 títulos que recomiendas en tu mensaje y concuerdan con la búsqueda. Nombres muy precisos.
    7. Responde SOLO el JSON puramente, asegurando que tiene un formato válido sin errores de sintaxis.
  `;

  try {
    const modelo = MODELOS_GRATUITOS[indiceActual];
    // console.log(`Intentando con modelo: ${modelo}`); // Opcional para debug

    const respuesta = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelo,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://quevemospues.com',
          'X-Title': 'QueVemosPues'
        }
      }
    );

    let con = respuesta.data.choices[0].message.content;
    con = con.replace(/```json|```/g, '').trim();
    const resultadoPrseado = JSON.parse(con);
    
    // Guardar en caché antes de retornar
    cacheIA.set(textoLimpio, resultadoPrseado);
    return resultadoPrseado;
  } catch (error) {
    const status = error.response?.status;
    const esErrorRotable = status === 429 || status === 404 || status === 502;

    if (esErrorRotable && reintentos < MODELOS_GRATUITOS.length - 1) {
      // Rotar al siguiente modelo y reintentar
      indiceActual = (indiceActual + 1) % MODELOS_GRATUITOS.length;
      console.warn(`Error ${status} en OpenRouter. Rotando a modelo: ${MODELOS_GRATUITOS[indiceActual]}`);
      
      // Si el error es 429, hacer un pequeño retraso antes de reintentar
      if (status === 429) {
        await new Promise(res => setTimeout(res, 800));
      }
      
      return analizarTextoConIA(texto, reintentos + 1); // Usar reintentos como contador de modelos probados
    }
    
    if (esErrorRotable) {
      console.warn('Todos los modelos agotados o no disponibles. Usando fallback local.');
    } else {
      console.error('Error en OpenRouter:', error.response?.data || error.message);
    }
    return fallbackLocal(texto);
  }
}

function fallbackLocal(texto) {
  const t = texto.toLowerCase();
  const analisis = {
    tipo: 'pelicula',
    generos: [],
    palabras_clave: [],
    titulo_referencia: null,
    mensaje: "Aquí tienes algunas recomendaciones basadas en tu búsqueda.",
    titulos_recomendados: []
  };

  if (t.includes('anime')) analisis.tipo = 'anime';
  else if (t.includes('serie')) analisis.tipo = 'serie';

  // Detección de "como [titulo]" (más flexible)
  const matchComo = t.match(/(?:como|parecid[oa]s? a|similar a|parecido? a)\s+([^,.]+)/);
  if (matchComo) {
    analisis.titulo_referencia = matchComo[1].trim();
  }

  // Filtrado de stop-words para palabras clave
  const stopWords = ['quiero', 'ver', 'una', 'un', 'el', 'la', 'pelicula', 'peliculas', 'serie', 'series', 'anime', 'animes', 'algo', 'parecido', 'parecida', 'como', 'busco', 'recomienda'];
  const palabras = t.split(/\s+/)
    .map(w => w.replace(/[.,!¡?¿]/g, ''))
    .filter(w => w.length > 2 && !stopWords.includes(w));
  
  analisis.palabras_clave = palabras.slice(0, 5);

  const keywords = {
    'acción|action': 'action',
    'comedia|comedy': 'comedy',
    'romance|amor': 'romance',
    'terror|horror|miedo|zombi|zombie|muertos vivientes': 'horror',
    'ciencia ficción|sci-fi|espacio|astronauta|espacial': 'sci-fi',
    'drama': 'drama',
    'fantasía|fantasy': 'fantasy',
    'guerra|war|militar': 'war',
    'historia|history': 'history',
    'misterio|mystery': 'mystery',
    'animación|dibujos': 'animation'
  };

  for (const [key, val] of Object.entries(keywords)) {
    if (new RegExp(key).test(t)) {
      if (!analisis.generos.includes(val)) {
        analisis.generos.push(val);
      }
    }
  }

  return analisis;
}
