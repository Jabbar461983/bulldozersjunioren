import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="centered-screen">
      <div>
        <h1>404</h1>
        <p>Diese Seite gibt es nicht.</p>
        <Link to="/">Zurück zur Startseite</Link>
      </div>
    </div>
  );
}
