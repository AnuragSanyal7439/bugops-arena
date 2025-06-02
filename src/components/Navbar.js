import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ padding: '1rem', background: '#f0f0f0' }}>
      <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
      <Link to="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</Link>
      <Link to="/challenge">Challenge</Link> {/* ✅ NEW LINK */}
    </nav>
  );
}

export default Navbar;
