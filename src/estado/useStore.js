import { create } from 'zustand';
import { supabase } from '../servicios/supabaseClient';

export const useStore = create((set, get) => ({
  // ---- Auth ----
  usuario: null,
  cargandoAuth: true,

  setUsuario: (usuario) => set({ usuario }),
  setCargandoAuth: (cargando) => set({ cargandoAuth: cargando }),

  iniciarSesion: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ usuario: data.user });
    await Promise.all([get().cargarFavoritos(), get().cargarHistorial()]);
    return data.user;
  },

  registrarse: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    set({ usuario: data.user });
    await Promise.all([get().cargarFavoritos(), get().cargarHistorial()]);
    return data.user;
  },

  cerrarSesion: async () => {
    await supabase.auth.signOut();
    set({ favoritos: [], historial: [] });
  },

  // ---- Favoritos ----
  favoritos: [],

  cargarFavoritos: async () => {
    const { usuario } = get();
    if (!usuario) return;

    const { data, error } = await supabase
      .from('favoritos')
      .select('*')
      .eq('id_usuario', usuario.id)
      .order('fecha_creacion', { ascending: false });

    if (!error && data) {
      set({ favoritos: data });
    }
  },

  agregarFavorito: async (contenido) => {
    const { usuario, favoritos } = get();
    if (!usuario) return;

    // No duplicar
    if (favoritos.some(f => f.id_contenido === contenido.id && f.tipo === contenido.tipo)) return;

    const nuevo = {
      id_usuario: usuario.id,
      id_contenido: contenido.id,
      titulo: contenido.titulo,
      imagen: contenido.imagen,
      tipo: contenido.tipo
    };

    const { data, error } = await supabase
      .from('favoritos')
      .insert(nuevo)
      .select()
      .single();

    if (error) {
      // Si el error es 409 (Conflict), significa que ya existe, lo cual es éxito para el usuario
      if (error.code === '23505') { // Código Postgres para Unique Violation
        get().cargarFavoritos();
        return;
      }
      console.error('Error al agregar favorito:', error);
      return;
    }

    if (data) {
      set({ favoritos: [data, ...favoritos] });
    }
  },

  eliminarFavorito: async (idContenido, tipo) => {
    const { usuario, favoritos } = get();
    if (!usuario) return;

    const { error } = await supabase
      .from('favoritos')
      .delete()
      .eq('id_usuario', usuario.id)
      .eq('id_contenido', idContenido)
      .eq('tipo', tipo);

    if (!error) {
      set({ favoritos: favoritos.filter(f => !(f.id_contenido === idContenido && f.tipo === tipo)) });
    }
  },

  esFavorito: (idContenido, tipo) => {
    return get().favoritos.some(f => f.id_contenido === idContenido && f.tipo === tipo);
  },

  // ---- Historial ----
  historial: [],

  cargarHistorial: async () => {
    const { usuario } = get();
    if (!usuario) return;

    const { data, error } = await supabase
      .from('historial_busquedas')
      .select('*')
      .eq('id_usuario', usuario.id)
      .order('fecha_creacion', { ascending: false })
      .limit(20);

    if (!error && data) {
      set({ historial: data });
    }
  },

  guardarBusqueda: async (consulta) => {
    const { usuario, historial } = get();
    if (!usuario || !consulta.trim()) return;

    const { data, error } = await supabase
      .from('historial_busquedas')
      .insert({ id_usuario: usuario.id, consulta })
      .select()
      .single();

    if (!error && data) {
      set({ historial: [data, ...historial].slice(0, 20) });
    }
  },

  // ---- UI ----
  resultados: [],
  cargando: false,
  error: null,
  detalleActual: null,

  setResultados: (resultados) => set({ resultados }),
  setCargando: (cargando) => set({ cargando }),
  setError: (error) => set({ error }),
  setDetalleActual: (detalle) => set({ detalleActual: detalle })
}));
