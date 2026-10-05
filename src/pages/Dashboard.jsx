import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { useRoomMate } from '../context/useRoomMate';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, room, expenses, tasks, shopping } = useRoomMate();
  const isOwner = profile.role === 'Owner';

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const yourShare = expenses.reduce((total, expense) => (
    total + (expense.splitBetween.find((person) => person.name === profile.name)?.amount || 0)
  ), 0);
  const pendingTasks = tasks.filter((task) => task.status === 'Pending').length;
  const shoppingItems = shopping.filter((item) => item.status === 'Pending').length;

  const recentExpenses = expenses.slice(0, 4);
  const recentTasks = tasks.slice(0, 4);

  return (
    <div className="page-panel dashboard-page">
      <div className="page-header-row">
        <div>
          <h1>Hello, {profile.name.split(' ')[0]}! 👋</h1>
          <p>Here&apos;s a quick look at your shared living.</p>
        </div>
      </div>

      <div className="summary-grid">
        <StatCard label="Total Expenses" value={`₹${totalExpenses.toLocaleString('en-IN')}`} accent="sage" icon="₹" />
        <StatCard label="Your Share" value={`₹${yourShare.toLocaleString('en-IN')}`} accent="blue" icon="◇" />
        <StatCard label="Pending Tasks" value={pendingTasks} accent="lavender" icon="✓" />
        <StatCard label="Shopping Items" value={shoppingItems} accent="peach" icon="🛒" />
      </div>

      <div className="dashboard-grid">
        <div className="card-block">
          <div className="subheader-row">
            <h3>My Room</h3>
          </div>
          <div className="room-card">
            <div className="room-header">
              <div>
                <strong>{room?.name || 'No room yet'}</strong>
                <p>{room ? `${room.activeMemberCount} active Members` : 'Create or join a room to get started'}</p>
                {room?.owner && <p>Owner / Manager: {room.owner.name}</p>}
              </div>
              <div className="mini-avatar-stack">
                {(room?.members || []).map((member) => (
                  <span key={member.id} className="mini-avatar">{member.initials}</span>
                ))}
              </div>
            </div>
            <ul className="room-member-list">
              {(room?.members || []).map((member) => (
                <li key={member.id}>{member.name}</li>
              ))}
            </ul>
            <div className="rent-row">
              <span>{isOwner ? 'Rent due from Members' : 'Monthly Rent'}</span>
              <strong>₹{Number(room?.monthlyRent || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="rent-row">
              <span>{isOwner ? 'Owner / Manager' : 'Your rent contribution'}</span>
              {!isOwner && <strong>₹{Number(room?.yourShare || 0).toLocaleString('en-IN')}</strong>}
            </div>
            {!room && <button type="button" className="secondary-btn" onClick={() => navigate('/my-room')}>Create or join a room</button>}
          </div>
        </div>

        <div className="card-block">
          <div className="subheader-row">
            <h3>Recent Expenses</h3>
          </div>
          <div className="list-surface">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="list-row clickable" onClick={() => navigate(`/expenses/${expense.id}`)}>
                <div>
                  <strong>{expense.title}</strong>
                  <span>₹{expense.amount.toLocaleString('en-IN')}</span>
                </div>
                <small>{expense.paidBy}</small>
              </div>
            ))}
            {recentExpenses.length === 0 && <p className="empty-message">No expenses yet.</p>}
          </div>
        </div>

        <div className="card-block">
          <div className="subheader-row">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <button type="button" onClick={() => navigate('/expenses')}>Add Expense</button>
            {!isOwner && <button type="button" onClick={() => navigate('/tasks')}>Add Task</button>}
            {!isOwner && <button type="button" onClick={() => navigate('/shopping-list')}>Add Shopping Item</button>}
            <button type="button" onClick={() => navigate('/my-room')}>{isOwner ? 'Manage Room' : 'View My Room'}</button>
          </div>
        </div>

        <div className="card-block">
          <div className="subheader-row">
            <h3>Recent Tasks</h3>
          </div>
          <div className="list-surface">
            {recentTasks.map((task) => (
              <div key={task.id} className="list-row">
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.status}</span>
                </div>
                <small>{task.assignee}</small>
              </div>
            ))}
            {recentTasks.length === 0 && <p className="empty-message">No tasks yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
