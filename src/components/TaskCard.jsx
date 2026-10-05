export default function TaskCard({ task, onToggle, onEdit, onDelete, canManage = true }) {
  return (
    <div className="task-row">
      <div className="task-main">
        <span className={`task-status ${task.status === 'Completed' ? 'done' : 'pending'}`}></span>
        <div>
          <h4>{task.title}</h4>
          <p>Assigned to: {task.assignee}</p>
        </div>
      </div>
      <div className="task-meta">Due: {task.dueDate}</div>
      <div className="task-meta">{task.priority}</div>
      <div className="task-meta">
        <span className={`status-badge ${task.status === 'Completed' ? 'success' : 'warning'}`}>
          {task.status}
        </span>
      </div>
      {canManage && <div className="task-actions">
        <button type="button" onClick={() => onToggle(task.id)}>{task.status === 'Completed' ? 'Undo' : 'Done'}</button>
        <button type="button" onClick={() => onEdit(task)}>Edit</button>
        <button type="button" className="danger" onClick={() => onDelete(task.id)}>Delete</button>
      </div>}
    </div>
  );
}
