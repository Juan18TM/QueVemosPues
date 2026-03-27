import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-contenido contenedor">
        <div className="footer-izquierda">
          <span className="footer-logo">QueVemosPues</span>
          <span className="footer-copy">© 2024 QueVemosPues. Powered by AI Intelligence.</span>
        </div>
        <div className="footer-enlaces">
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB API</a>
          <a href="https://jikan.moe/" target="_blank" rel="noopener noreferrer">Jikan API</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
