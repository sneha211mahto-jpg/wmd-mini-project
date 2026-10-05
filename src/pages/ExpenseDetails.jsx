import { useNavigate, useParams } from 'react-router-dom';
import { useRoomMate } from '../context/useRoomMate';

export default function ExpenseDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { expenses, profile, deleteExpense } = useRoomMate();

  const expense = expenses.find((item) => String(item.id) === String(id));

  if (!expense) {
    return <div className="page-panel">No expense selected.</div>;
  }

  const yourShare = profile.role === 'Owner'
    ? 0
    : expense.splitBetween.find((person) => person.name === profile.name)?.amount;
  const handleDelete = async () => {
    const result = await deleteExpense(Number(id));
    if (result) navigate('/expenses');
  };

  return (
    <div className="page-panel detail-page">
      <div className="detail-card">
        <div className="detail-head">
          <div>
            <h1>{expense.title}</h1>
            <div className="price">₹{expense.amount.toLocaleString('en-IN')}</div>
          </div>
          <button type="button" className="close-btn-soft" onClick={() => navigate('/expenses')}>×</button>
        </div>

        <div className="detail-grid">
          <div className="detail-row"><span>Paid by:</span><strong>{expense.paidBy}</strong></div>
          <div className="detail-row"><span>Date:</span><strong>{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
          <div className="detail-row"><span>Category:</span><strong>{expense.category}</strong></div>
          {yourShare !== undefined && <div className="detail-row"><span>{profile.role === 'Owner' ? 'Owner contribution:' : 'Your share:'}</span><strong>₹{yourShare.toLocaleString('en-IN')}</strong></div>}
        </div>

        <div className="split-box">
          <h3>Split Between:</h3>
          {expense.splitBetween.map((person) => (
            <div key={person.name} className="split-person">
              <span>{person.name}</span>
              <strong>₹{person.amount.toLocaleString('en-IN')}</strong>
            </div>
          ))}
        </div>

        <div className="detail-actions">
          {expense.splitType !== 'room_monthly_rent' && <button type="button" className="secondary-btn" onClick={() => navigate(`/expenses?edit=${expense.id}`)}>Edit</button>}
          {expense.splitType !== 'room_monthly_rent' && <button type="button" className="tertiary-btn" onClick={handleDelete}>Delete</button>}
          <button type="button" className="primary-btn" onClick={() => navigate('/expenses')}>Close</button>
        </div>
      </div>
    </div>
  );
}
