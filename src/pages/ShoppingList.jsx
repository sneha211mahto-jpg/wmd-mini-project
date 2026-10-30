import { useState } from 'react';
import Modal from '../components/Modal';
import { useRoomMate } from '../context/useRoomMate';

const emptyItem = { item: '', quantity: '', status: 'Pending' };

export default function ShoppingList() {
  const { shopping, room, saving, isMember, addShoppingItem, updateShopping, deleteShopping } = useRoomMate();
  const canManageShopping = isMember;
  const [tab, setTab] = useState('Pending');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [editingItem, setEditingItem] = useState(null);

  const filteredItems = shopping.filter((item) => item.status === tab);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyItem);
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = editingItem
      ? await updateShopping(editingItem, form)
      : await addShoppingItem(form);
    if (!result) return;
    setShowModal(false);
    setForm(emptyItem);
    setEditingItem(null);
  };

  return (
    <div className="page-panel">
      <div className="page-header-row">
        <div>
          <h1>Shopping List</h1>
        </div>
        {canManageShopping && <button type="button" className="primary-btn" onClick={openAddModal} disabled={!room || saving}>+ Add Item</button>}
      </div>
      {!room && <p className="empty-message">Create a room in My Room before adding shopping items.</p>}

      <div className="toolbar-row">
        <div className="filter-group">
          {['Pending', 'Purchased'].map((value) => (
            <button
              key={value}
              type="button"
              className={tab === value ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setTab(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card shopping-table">
        {filteredItems.map((item) => (
          <div key={item.id} className="shopping-row">
            <div>
              <strong>{item.item}</strong>
              <small>{item.quantity}</small>
            </div>
            <span className={`status-badge ${item.status === 'Purchased' ? 'success' : 'warning'}`}>
              {item.status}
            </span>
            {canManageShopping && <div className="task-actions">
              <button type="button" disabled={saving} onClick={() => updateShopping(item.id, { status: item.status === 'Purchased' ? 'Pending' : 'Purchased' })}>
                {item.status === 'Purchased' ? 'Reopen' : 'Buy'}
              </button>
              <button type="button" onClick={() => {
                setEditingItem(item.id);
                setForm({ item: item.item, quantity: item.quantity, status: item.status });
                setShowModal(true);
              }}>Edit</button>
              <button type="button" className="danger" disabled={saving} onClick={() => deleteShopping(item.id)}>Delete</button>
            </div>}
          </div>
        ))}
        {filteredItems.length === 0 && <p className="empty-message">No items in this list.</p>}
      </div>

      <Modal open={showModal} title={editingItem ? 'Edit Shopping Item' : 'Add Shopping Item'} onClose={() => setShowModal(false)}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Item</span>
            <input value={form.item} onChange={(event) => setForm({ ...form, item: event.target.value })} required />
          </label>
          <label>
            <span>Quantity</span>
            <input value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editingItem ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
