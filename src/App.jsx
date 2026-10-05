import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { RoomMateProvider } from './context/RoomMateContext.jsx';
import { useRoomMate } from './context/useRoomMate';
import Dashboard from './pages/Dashboard';
import ExpenseDetails from './pages/ExpenseDetails';
import ExpenseSummary from './pages/ExpenseSummary';
import Expenses from './pages/Expenses';
import Login from './pages/Login';
import MyRoom from './pages/MyRoom';
import Profile from './pages/Profile';
import ShoppingList from './pages/ShoppingList';
import Tasks from './pages/Tasks';
import './App.css';

function AppLayout() {
  const { isLoggedIn, authLoading, dataLoading, error, clearError } = useRoomMate();

  if (authLoading) {
    return <div className="session-loading" role="status">Checking your RoomMate session...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-panel">
        <Topbar />
        <main className="content-area">
          {error && (
            <div className="api-notice" role="alert">
              <span>{error}</span>
              <button type="button" onClick={clearError}>Dismiss</button>
            </div>
          )}
          {dataLoading && <p className="loading-notice" role="status">Loading your shared home...</p>}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-room" element={<MyRoom />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/:id" element={<ExpenseDetails />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/expense-summary" element={<ExpenseSummary />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <RoomMateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </RoomMateProvider>
  );
}

export default App;
