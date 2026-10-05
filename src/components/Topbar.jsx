import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRoomMate } from '../context/useRoomMate';

const pageTitles = {
  '/dashboard': 'Home',
  '/my-room': 'My Room',
  '/expenses': 'Expenses',
  '/tasks': 'Tasks',
  '/shopping-list': 'Shopping List',
  '/expense-summary': 'Expense Summary',
  '/profile': 'Profile',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useRoomMate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">RoomMate</div>
        <div className="search-box">
          <span>⌕</span>
          <input type="text" placeholder="Search anything..." />
        </div>
      </div>

      <div className="topbar-right">
        <div className="profile-menu" ref={menuRef}>
          <button
            type="button"
            className="user-info"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <div className="avatar small">{profile.avatar}</div>
            <span>{profile.name.split(' ')[0]}</span>
            <span className="caret">▾</span>
          </button>
          {menuOpen && (
            <div className="profile-dropdown" role="menu">
              <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button type="button" role="menuitem" onClick={() => {
                logout();
                setMenuOpen(false);
                navigate('/login', { replace: true });
              }}>Logout</button>
            </div>
          )}
        </div>
      </div>

      <div className="page-badge">{pageTitles[location.pathname] || 'Home'}</div>
    </header>
  );
}
