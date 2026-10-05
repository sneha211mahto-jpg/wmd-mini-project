import { NavLink, useNavigate } from 'react-router-dom';
import { useRoomMate } from '../context/useRoomMate';

const navItems = [
  { label: 'Home', path: '/dashboard', icon: '⌂' },
  { label: 'My Room', path: '/my-room', icon: '▣' },
  { label: 'Expenses', path: '/expenses', icon: '₹' },
  { label: 'Expense Summary', path: '/expense-summary', icon: '▤' },
  { label: 'Tasks', path: '/tasks', icon: '✓' },
  { label: 'Shopping List', path: '/shopping-list', icon: '🛒' },
  { label: 'Profile', path: '/profile', icon: '◔' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useRoomMate();

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">R</div>
        <div>
          <h2>RoomMate</h2>
          <p>Better Together</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="logout-btn"
        onClick={() => {
          logout();
          navigate('/login', { replace: true });
        }}
      >
        Logout
      </button>
    </aside>
  );
}
