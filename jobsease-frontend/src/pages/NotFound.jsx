import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-heading">Page not found</h2>
        <p className="not-found-text">
          The page you are looking for doesn't exist or was moved.
        </p>
        <Link to="/dashboard" className="not-found-link">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
