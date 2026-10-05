export default function ExpenseCard({ expense, onClick, onEdit, onDelete, canManage = true }) {
  return (
    <div className="expense-row" onClick={() => onClick(expense.id)}>
      <div className="cell expense-name">{expense.title}</div>
      <div className="cell amount">₹{expense.amount.toLocaleString('en-IN')}</div>
      <div className="cell">{expense.paidBy}</div>
      <div className="cell">{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <div className="cell"><span className="pill pill-soft">{expense.category}</span></div>
      <div className="cell actions" onClick={(event) => event.stopPropagation()}>
        {canManage && <button type="button" onClick={() => onEdit(expense)}>Edit</button>}
        {canManage && <button type="button" className="danger" onClick={() => onDelete(expense.id)}>Delete</button>}
      </div>
    </div>
  );
}
