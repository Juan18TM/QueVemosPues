# 🍿 QueVemosPues

**QueVemosPues** es una plataforma inteligente de recomendación de películas, series y animes, diseñada para resolver la eterna pregunta de _¿qué vemos hoy?_.

Gracias a un poderoso motor de **Inteligencia Artificial Multi-Modelo**, la plataforma analiza el estado de ánimo, los gustos subjetivos y las peticiones en lenguaje natural del usuario para recomendar el contenido audiovisual perfecto, cruzando los datos en tiempo real con proveedores oficiales de entretenimiento.

---

## ✨ Características Principales

- 🧠 **Buscador AI "Smart Search":** No busques por título. Busca por concepto, ej: _"recomiendame peliculas como el conjuro" etc_.
- ⚡ **Orquestador Multi-IA en Cascada:** Garantiza latencia ultra-baja y 100% de disponibilidad al usar una jerarquía de inteligencias:
  1.  **Groq (Llama-3.3-70b-versatile):** Procesamiento instantáneo a velocidad LPU de 0.2 segundos.
  2.  **Google Gemini (1.5 Flash):** Respaldo de razonamiento profundo y latencia nativa multimodelo.
  3.  **OpenRouter (Fallback):** Modelos auxiliares open-source como red de seguridad antierrores.
- 📡 **Integración Multi-API Global:**
  - **TMDB:** Meta-datos en tiempo real, carteleras y proveedores de streaming para películas y series.
  - **Jikan V4 (MyAnimeList):** Conexión directa con mecanismo de encolamiento asíncrono anti-WAF (429) para extraer detalles y streaming de Anime en masa.
- 📺 **Disponibilidad Legal Instantánea (Streaming Providers):** Cuando abres cualquier título, la app te muestra **dónde lo puedes ver legalmente en tu país** (Netflix, Crunchyroll, Max, Prime Video, Hulu, etc.) extraídos nítidamente a través de CDN de vectores en alta definición.
- ❤️ **Listas Reales y Favoritos:** Gracias a nuestro Backend en la nube, puedes guardar tus descubrimientos para hacer la "lista de pendientes" perfecta para este fin de semana.

---

## 🛠️ Tecnologías y Arquitectura

Este proyecto está construido bajo una arquitectura moderna centrada en el rendimiento frontend y Serverless API.

### Stack Tecnológico

- **React 19**
- **Vite** (Build Tool)
- **Zustand** (Estado global ligero)
- **React Router DOM v7** (Enrutamiento dinámico SPA)
- **Lucide React** (Iconografía limpia de trazos)
- **Axios** (Peticiones asíncronas HTTP con interceptores)

### Database & Servicios Externos

- **Supabase** (Autenticación e infraestructura PostgreSQL)
- **TMDB API & Jikan API** (Bases de datos cinematográficas en tiempo real)
- **AI SDKs:** Groq, Gemini Studio AI, OpenRouter.

### Dockerización & Dokploy Deploy

- **Dockerfile Multi-Stage:** Una imagen que empaqueta separadamente la compilación Vite y traslada la estática depurada al servidor asíncrono súper rápido de Nginx en Alpine Linux para producción Dokploy/VPS nativo.

---

## ☁️ Infraestructura y Despliegue (CubePath + Dokploy)

Para llevar este proyecto a producción con el máximo rendimiento y control total sobre los servidores, se optó por una arquitectura de despliegue propia:

1.  **Servidor Privado (VPS):** Alojado en **CubePath**, lo que nos garantiza recursos dedicados ininterrumpidos y una transferencia de datos estable para procesar las múltiples llamadas a las APIs externas y el orquestador sin depender de límites de plataformas gratuitas.
2.  **Gestor de Despliegue (Dokploy):** instalamos Dokploy dentro de CubePath. Dokploy actúa como un PaaS (Platform as a Service) privado que:
    - Lee automáticamente nuestro `Dockerfile`.
    - Inyecta de forma segura todas las variables de entorno de producción (Groq, Gemini, TMDB, Supabase).
    - Construye la imagen optimizada con Nginx.

## 🛡️ Estabilidad Garantizada (Engineering Features)

- **Resiliencia Jikan Anti-Bans:** Un manejador interrumpe las descargas simultáneas en rafaga (`Promise.all()`) para formarlas en una pequeña cola con `Math.max()` de retrasos por fracción de milisegundos y evitar un baneo tipo DDoS (429 Too Many Requests). Si aún así falla, un bloque de Backoff Exponencial reintenta de forma recursiva hasta pasar limpio.
- **Purificador de "Alucinaciones" Json (Regex Check):** Sin importar qué disparate intente devolver incidentalmente el modelo de IA gratuito interrumpiendo las comillas, Regex limpia y blinda la respuesta cruda para extraer textualmente el JSON, evitando que el cliente `JSON.parse` se rompa.
