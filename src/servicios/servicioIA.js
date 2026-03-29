import axios from 'axios';

const API_KEY_OPENROUTER = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_KEY_GROQ = import.meta.env.VITE_GROQ_API_KEY;
const API_KEY_GEMINI = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_STUDIO;
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

  if (!API_KEY_OPENROUTER && !API_KEY_GROQ && !API_KEY_GEMINI) {
    console.warn('API Keys (OpenRouter, Groq, Gemini) no configuradas. Usando fallback local.');
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
    5. "mensaje": Un breve mensaje de la IA. NO uses NINGUNA comilla (ni simple ni doble) dentro del texto del mensaje para evitar corromper el JSON.
    6. "titulos_recomendados": Un arreglo con exactamente 10 títulos. SÚPER IMPORTANTE: Deben ser EXTREMADAMENTE RELEVANTES a la solicitud original. Si el usuario busca algo como otra obra o una vibra específica, prioriza obligatoriamente secuelas, spin-offs directos de ese mismo universo, o producciones modernas que compartan exactamente el mismo tono, atmósfera y género de acción/estilo. No des resultados genéricos o antiguos si buscan algo moderno. Nombres muy exactos.
    7. Responde ÚNICAMENTE un JSON válido. Todas las claves y valores string deben estar rodeadas por comillas dobles estrictamente.
  `;

  let con = null;

  // ORQUESTADOR DE CASCADA

  // 1. Intentar con GROQ (Rapidez extrema)
  if (API_KEY_GROQ && !con) {
    try {
      console.log('Orquestador: Consultando a Groq (llama-3.3-70b-versatile)...');
      const resGroq = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY_GROQ}`,
            'Content-Type': 'application/json'
          }
        }
      );
      con = resGroq.data.choices[0].message.content;
    } catch (error) {
      console.warn('Groq falló, saltando a Gemini...', error.response?.status);
    }
  }

  // 2. Intentar con GOOGLE GEMINI (Inteligencia profunda)
  if (API_KEY_GEMINI && !con) {
    try {
      console.log('Orquestador: Consultando a Google Gemini...');
      const resGemini = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY_GEMINI}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      con = resGemini.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.warn('Google Gemini falló, saltando a OpenRouter...', error.response?.status);
    }
  }

  // 3. Intentar con OPENROUTER (La Ruleta Clásica)
  if (API_KEY_OPENROUTER && !con) {
    try {
      const modelo = MODELOS_GRATUITOS[indiceActual];
      console.log(`Orquestador: Consultando a OpenRouter (${modelo})...`);

      const resOpenRouter = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelo,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY_OPENROUTER}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://quevemospues.com',
            'X-Title': 'QueVemosPues'
          }
        }
      );
      con = resOpenRouter.data.choices[0].message.content;
    } catch (error) {
      const status = error.response?.status;
      if ((status === 429 || status === 404 || status === 502) && reintentos < MODELOS_GRATUITOS.length - 1) {
        indiceActual = (indiceActual + 1) % MODELOS_GRATUITOS.length;
        console.warn(`OpenRouter agotado. Rotando modelo...`);
        return analizarTextoConIA(texto, reintentos + 1);
      }
      console.warn('OpenRouter falló definitivamente.', error.message);
    }
  }

  // Si a pesar de los 3 proveedores de talla mundial no hubo respuesta, usar Local
  if (!con) {
    console.warn('Todos los proveedores fallaron. Usando fallback local.');
    return fallbackLocal(texto);
  }

  // Procesar Resultado JSON
  try {
    const matchJson = con.match(/\{[\s\S]*\}/);
    if (matchJson) {
      con = matchJson[0];
    }
    const resultadoParseado = JSON.parse(con);
    
    cacheIA.set(textoLimpio, resultadoParseado);
    return resultadoParseado;
  } catch (parseError) {
    console.error('Error de parseo JSON desde el Orquestador:', parseError.message);
    
    // Si hubo error de parseo, rotamos y forzamos un reintento a través de OpenRouter
    if (reintentos < MODELOS_GRATUITOS.length) {
      console.warn('Rotando proveedor/modelo por error de JSON y reintentando...');
      indiceActual = (indiceActual + 1) % MODELOS_GRATUITOS.length;
      return analizarTextoConIA(texto, reintentos + 1);
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
