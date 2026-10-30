import { useState } from 'react';
import Modal from '../components/Modal';
import TaskCard from '../components/TaskCard';
import { useRoomMate } from '../context/useRoomMate';

export default function Tasks() {
  const { tasks, room, profile, saving, isMember, addTask, updateTask, deleteTask } = useRoomMate();
  const participants = room?.members || [];
  const canManageTasks = isMember;
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', assignee: '', dueDate: '', priority: 'Medium' });
  const [editingTask, setEditingTask] = useState(null);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'All') return true;
    return task.status === filter;
  });

  const openCreate = () => {
    setForm({
      title: '',
      assignee: participants[0]?.name || '',
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'Medium',
    });
    setEditingTask(null);
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task.id);
    setForm({
      title: task.title,
      assignee: task.assignee,
      dueDate: task.dueDate,
      priority: task.priority,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      title: form.title,
      status: editingTask ? tasks.find((task) => task.id === editingTask)?.status || 'Pending' : 'Pending',
    };

    const result = editingTask
      ? await updateTask(editingTask, payload)
      : await addTask(payload);
    if (!result) return;

    setShowModal(false);
    setEditingTask(null);
    setForm({ title: '', assignee: '', dueDate: '', priority: 'Medium' });
  };

  return (
    <div className="page-panel">
      <div className="page-header-row">
        <div>
          <h1>Tasks</h1>
        </div>
        {canManageTasks && <button type="button" className="primary-btn" onClick={openCreate} disabled={!room || saving}>+ Add Task</button>}
      </div>
      {!room && <p className="empty-message">Create a room in My Room before adding shared tasks.</p>}

      <div className="toolbar-row">
        <div className="filter-group">
          {['All', 'Pending', 'Completed'].map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card tasks-table">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canManage={canManageTasks}
            canComplete={isMember && participants.some((member) =>
              Number(member.id) === Number(profile?.id) && member.name.toLowerCase() === task.assignee.toLowerCase()
            )}
            onToggle={(taskId) => {
              const item = tasks.find((entry) => entry.id === taskId);
              updateTask(taskId, { status: item.status === 'Completed' ? 'Pending' : 'Completed' });
            }}
            onEdit={openEdit}
            onDelete={deleteTask}
          />
        ))}
        {filteredTasks.length === 0 && <p className="empty-message">No tasks found.</p>}
      </div>

      <Modal open={showModal} title={editingTask ? 'Edit Task' : 'Add Task'} onClose={() => setShowModal(false)}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Task name</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>

          <label>
            <span>Assigned person</span>
            <select value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} required>
              {participants.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
            </select>
          </label>

          <label>
            <span>Due date</span>
            <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
          </label>

          <label>
            <span>Priority</span>
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editingTask ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
