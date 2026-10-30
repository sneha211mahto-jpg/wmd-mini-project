import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExpenseCard from '../components/ExpenseCard';
import Modal from '../components/Modal';
import { useRoomMate } from '../context/useRoomMate';

export default function Expenses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { expenses, room, profile, saving, isMember, addExpense, updateExpense, deleteExpense } = useRoomMate();
  const participants = room?.members || [];
  const makeEmptyExpense = () => ({
    title: '',
    amount: '',
    category: 'Rent',
    paidBy: profile?.name || participants[0]?.name || '',
    date: new Date().toISOString().slice(0, 10),
  });
  const initialEdit = expenses.find((expense) => String(expense.id) === searchParams.get('edit'));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(Boolean(initialEdit));
  const [editingExpense, setEditingExpense] = useState(initialEdit?.id || null);
  const [form, setForm] = useState(() => initialEdit ? { ...initialEdit, amount: String(initialEdit.amount) } : makeEmptyExpense());

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesFilter = filter === 'All' || expense.category === filter;
      const matchesSearch = `${expense.title} ${expense.paidBy}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [expenses, filter, search]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const openCreateModal = () => {
    setForm(makeEmptyExpense());
    setEditingExpense(null);
    setShowModal(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense.id);
    setForm({ ...expense, amount: String(expense.amount) });
    setShowModal(true);
  };

  useEffect(() => {
    if (searchParams.has('edit')) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    const result = editingExpense
      ? await updateExpense({ ...payload, id: editingExpense })
      : await addExpense(payload);
    if (!result) return;

    setShowModal(false);
    setForm(makeEmptyExpense());
    setEditingExpense(null);
  };

  const handleDelete = async (expenseId) => {
    await deleteExpense(expenseId);
  };

  return (
    <div className="page-panel">
      <div className="page-header-row">
        <div>
          <h1>Expenses</h1>
        </div>
        <button type="button" className="primary-btn" onClick={openCreateModal} disabled={!isMember || saving}>+ Add Expense</button>
      </div>
      {!room && <p className="empty-message">Create a room in My Room before adding shared expenses.</p>}

      <div className="expenses-summary-row">
        <div className="inline-stat">
          <span>Total Expenses:</span>
          <strong>₹{totalExpenses.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="filter-group">
          {['All', 'Rent', 'Grocery', 'Bills', 'Others'].map((category) => (
            <button
              key={category}
              type="button"
              className={filter === category ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search expenses..."
        />
      </div>

      <div className="table-card">
        <div className="table-header">
          <span>Expense</span>
          <span>Amount</span>
          <span>Paid By</span>
          <span>Date</span>
          <span>Category</span>
          <span>Actions</span>
        </div>

        {filteredExpenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            canManage={isMember && expense.splitType !== 'room_monthly_rent'}
            onClick={(id) => navigate(`/expenses/${id}`)}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        ))}
        {filteredExpenses.length === 0 && <p className="empty-message">No expenses found.</p>}
      </div>

      <Modal open={showModal} title={editingExpense ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowModal(false)}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>

          <label>
            <span>Amount</span>
            <input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
          </label>

          <label>
            <span>Category</span>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option>Rent</option>
              <option>Grocery</option>
              <option>Bills</option>
              <option>Others</option>
            </select>
          </label>

          <label>
            <span>Paid By</span>
            <select value={form.paidBy || ''} onChange={(event) => setForm({ ...form, paidBy: event.target.value })} required>
              {participants.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
            </select>
          </label>

          <label>
            <span>Date</span>
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
          </label>

          <label>
            <span>Split Between</span>
            <div className="split-list">
              {participants.map((member) => (
                <div key={member.id} className="split-item">
                  <span>{member.name}</span>
                  <strong>₹{(Number(form.amount || 0) / Math.max(participants.length, 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                </div>
              ))}
            </div>
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editingExpense ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
