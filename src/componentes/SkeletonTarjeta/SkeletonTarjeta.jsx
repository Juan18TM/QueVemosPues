import './SkeletonTarjeta.css';

export default function SkeletonTarjeta() {
  return (
    <article className="skeleton-tarjeta">
      <div className="skeleton-imagen-wrapper shimmer"></div>
      <div className="skeleton-info">
        <div className="skeleton-titulo shimmer"></div>
        <div className="skeleton-anio shimmer"></div>
      </div>
    </article>
  );
}
