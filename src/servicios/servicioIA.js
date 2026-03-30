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
export async function analizarTextoConIA(texto, reintentos = 1, tipoForzado = null) {
  const textoLimpio = texto.trim();
  
  // Generar clave de caché que incluya el tipo forzado
  const cacheKey = `${textoLimpio}-${tipoForzado || 'auto'}`;
  
  // Guarda: No gastar IA en textos muy cortos
  if (textoLimpio.length < 3) {
    return fallbackLocal(textoLimpio);
  }

  // Caché: Retornar resultado memorizado si existe
  if (cacheIA.has(cacheKey)) {
    console.log('Usando caché de IA para:', cacheKey);
    return cacheIA.get(cacheKey);
  }

  if (!API_KEY_OPENROUTER && !API_KEY_GROQ && !API_KEY_GEMINI) {
    console.warn('API Keys (OpenRouter, Groq, Gemini) no configuradas. Usando fallback local.');
    return fallbackLocal(textoLimpio);
  }

  const fechaActual = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  // Instrucción especial si el tipo está forzado
  const instruccionForzada = tipoForzado 
    ? `EL USUARIO HA FORZADO EL TIPO: "${tipoForzado.toUpperCase()}". Todas tus recomendaciones y análisis DEBEN ser exclusivamente de este tipo.`
    : '';

  const prompt = `
    Eres un "Estratega Cinematográfico de Élite" especializado en curación de contenido (películas, series y anime). 
    Tu misión es analizar la solicitud del usuario y devolver una respuesta técnica, precisa y de alta calidad (TOP recommendations).

    CONTEXTO ACTUAL: Estamos en ${fechaActual}. 
    IMPORTANTE: Ya se han estrenado megaproducciones como "Project Hail Mary" (marzo 2026) y "Ballerina" (2025). Inclúyelas en tus recomendaciones si encajan con el género o atmósfera solicitada.
    
    ${instruccionForzada}

    REGLAS DE ORO PARA RECOMENDACIONES:
    1. RELEVANCIA EXTREMA: Si el usuario busca algo como "John Wick" o "Sci-fi inteligente", tus 20 títulos recomendados DEBEN incluir obligatoriamente sus spin-offs modernos ("Ballerina") y éxitos contemporáneos de alto impacto ("Extraction", "Atomic Blonde", "Project Hail Mary"). Comparte el ADN de la obra (temas, atmósfera, estilo visual, coreografías).
    2. CALIDAD DE CURACIÓN: Prioriza obras con buena crítica o estatus de culto. No des resultados genéricos o de relleno.
    3. ESTRATEGIA DE BÚSQUEDA: En "busqueda_optimizada", crea un string de búsqueda TÉCNICO en INGLÉS (ej: "supernatural horror", "mind-bending sci-fi", "neo-noir action"). No incluyas frases en español como "peliculas de..." ya que TMDB no las indexa bien.
    4. PALABRAS CLAVE: No extraigas palabras literales; proporciona etiquetas conceptuales (ej: "slow burn", "plot twist", "cinematografía neón", "gun-fu").

    RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO (sin bloques de código, sin markdown):
    {
      "tipo": "${tipoForzado || 'pelicula | serie | anime'}",
      "generos": ["Genero1", "Genero2"],
      "palabras_clave": ["Etiqueta1", "Etiqueta2", "Etiqueta3"],
      "titulo_referencia": "Nombre corregido de la obra mencionada" | null,
      "busqueda_optimizada": "Keywords técnicas en inglés",
      "mensaje": "Mensaje sofisticado y breve justificando la selección general",
      "titulos_recomendados": ["Titulo 1", "Titulo 2", ..., "Titulo 20"],
      "recomendaciones_detalle": [
        { "titulo": "Titulo 1", "razon": "Breve frase potente de por qué verla" }
      ]
    }

    TEXTO DEL USUARIO: "${texto}"
    
    ${instruccionForzada}

    IMPORTANTE: 
    - No uses comillas dentro del "mensaje" o "razon" para evitar errores de parseo JSON.
    - Asegúrate de que "titulos_recomendados" contenga exactamente 20 títulos muy potentes.
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
    
    // Asegurar compatibilidad y campos mínimos
    if (!resultadoParseado.busqueda_optimizada) {
      resultadoParseado.busqueda_optimizada = textoLimpio;
    }
    if (!resultadoParseado.recomendaciones_detalle) {
      resultadoParseado.recomendaciones_detalle = (resultadoParseado.titulos_recomendados || []).map(t => ({
        titulo: t,
        razon: "Recomendación basada en tus preferencias."
      }));
    }
    
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

/**
 * CONTINUACIÓN DE DESCUBRIMIENTO (MODO PROFUNDO)
 * Solicita a la IA 10 recomendaciones adicionales basadas en la consulta original,
 * pero prohibiendo explícitamente los títulos que ya se mostraron.
 */
export async function obtenerMasRecomendacionesIA(texto, titulosVistos = [], tipo = 'pelicula') {
  const fechaActual = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  const prompt = `
    Eres el "Estratega Cinematográfico de Élite" en una sesión de descubrimiento PROFUNDO.
    Estamos en ${fechaActual}. 
    IMPORTANTE: "Project Hail Mary" (marzo 2026) y "Ballerina" (2025) ya están disponibles y son éxitos masivos.

    El usuario busca: "${texto}"
    YA RECOMENDASTE ESTOS TÍTULOS (ESTÁN PROHIBIDOS): [${titulosVistos.join(', ')}]

    TAREA:
    Genera 10 títulos NUEVOS y ÚNICOS que no estén en la lista de arriba, pero que mantengan la misma calidad y relevancia "Pro".
    No repitas NADA. Si el usuario buscó una saga o un tema como "ciencia ficción", busca joyas ocultas, éxitos recientes como "Project Hail Mary" o películas con el mismo ADN técnico.

    RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO:
    {
      "titulos_recomendados": ["Nuevo 1", "Nuevo 2", ..., "Nuevo 10"],
      "recomendaciones_detalle": [
        { "titulo": "Nuevo 1", "razon": "Por qué es la siguiente elección lógica" }
      ],
      "mensaje": "Breve comentario sobre esta nueva selección"
    }
  `;

  // Usamos la misma lógica de orquestación (Groq > Gemini > OpenRouter)
  // Para brevedad en esta implementación estratégica, llamaremos al orquestador principal
  // pero con el prompt de "Seguir".
  
  // Como analizarTextoConIA está diseñada para el análisis inicial,
  // vamos a extraer la lógica de llamada a una función interna 'consultarOrquestador'
  // o simplemente duplicar el flujo de consulta aquí para este prompt específico.

  return consultarOrquestador(prompt);
}

// Factorización de la lógica de consulta para evitar duplicación
async function consultarOrquestador(prompt, reintentos = 1) {
  let con = null;

  // 1. Groq
  if (API_KEY_GROQ) {
    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }, { headers: { 'Authorization': `Bearer ${API_KEY_GROQ}` } });
      con = res.data.choices[0].message.content;
    } catch (e) {}
  }

  // 2. Gemini
  if (!con && API_KEY_GEMINI) {
    try {
      const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY_GEMINI}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      con = res.data.candidates[0].content.parts[0].text;
    } catch (e) {}
  }

  // 3. OpenRouter
  if (!con && API_KEY_OPENROUTER) {
    try {
      const modelo = MODELOS_GRATUITOS[indiceActual];
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: modelo,
        messages: [{ role: 'user', content: prompt }]
      }, { headers: { 'Authorization': `Bearer ${API_KEY_OPENROUTER}` } });
      con = res.data.choices[0].message.content;
    } catch (e) {
      if (reintentos < 3) {
        indiceActual = (indiceActual + 1) % MODELOS_GRATUITOS.length;
        return consultarOrquestador(prompt, reintentos + 1);
      }
    }
  }

  if (!con) return { titulos_recomendados: [] };

  try {
    const matchJson = con.match(/\{[\s\S]*\}/);
    return JSON.parse(matchJson ? matchJson[0] : con);
  } catch (e) {
    return { titulos_recomendados: [] };
  }
}

export function fallbackLocal(texto) {
  const t = texto.toLowerCase();
  const analisis = {
    tipo: 'pelicula',
    generos: [],
    palabras_clave: [],
    titulo_referencia: null,
    busqueda_optimizada: texto,
    mensaje: "Aquí tienes algunas recomendaciones basadas en tu búsqueda.",
    titulos_recomendados: [],
    recomendaciones_detalle: []
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
