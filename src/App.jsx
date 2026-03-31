import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './servicios/supabaseClient';
import { useStore } from './estado/useStore';
import Navbar from './componentes/Navbar/Navbar';
import Footer from './componentes/Footer/Footer';
import RutaProtegida from './componentes/RutaProtegida/RutaProtegida';
import IntroAnimacion from './componentes/IntroAnimacion/IntroAnimacion';
import Inicio from './paginas/Inicio/Inicio';
import Login from './paginas/Auth/Login';
import Registro from './paginas/Auth/Registro';
import Buscar from './paginas/Buscar/Buscar';
import Favoritos from './paginas/Favoritos/Favoritos';
import './App.css';

function App() {
  const { setUsuario, setCargandoAuth, cargarFavoritos, cargarHistorial } = useStore();
  const [mostrarIntro, setMostrarIntro] = useState(
    () => !sessionStorage.getItem('intro-vista')
  );

  const handleFinIntro = () => {
    sessionStorage.setItem('intro-vista', '1');
    setMostrarIntro(false);
  };

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null);
      setCargandoAuth(false);
      if (session?.user) {
        cargarFavoritos();
        cargarHistorial();
      }
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
      if (session?.user) {
        cargarFavoritos();
        cargarHistorial();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      {mostrarIntro && <IntroAnimacion onFin={handleFinIntro} />}
      <div className="app">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route
              path="/favoritos"
              element={
                <RutaProtegida>
                  <Favoritos />
                </RutaProtegida>
              }
            />
            <Route
              path="/perfil"
              element={
                <RutaProtegida>
                  <Favoritos />
                </RutaProtegida>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
