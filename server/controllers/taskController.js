const db = require('../config/db');

const getActiveResidentMembership = async (roomId, userId) => {
  const [rows] = await db.query(
    `SELECT rm.id
     FROM room_members rm
     INNER JOIN rooms r ON r.id = rm.room_id
     WHERE rm.room_id = ? AND rm.user_id = ? AND rm.is_active = TRUE
       AND r.created_by <> rm.user_id`,
    [roomId, userId],
  );
  return rows.length > 0;
};

const getTasks = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*
       FROM tasks t
       INNER JOIN room_members rm ON rm.room_id = t.room_id
      WHERE rm.user_id = ? AND rm.is_active = TRUE
       ORDER BY t.created_at DESC`,
      [req.user.id],
    );

    res.status(200).json({ tasks: rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Database error while fetching tasks' });
  }
};

const createTask = async (req, res) => {
  try {
    const { room_id, title, assigned_to, due_date, status, priority } = req.body;

    if (!room_id || !title?.trim() || !assigned_to || !due_date) {
      return res.status(400).json({ message: 'Please fill in all task fields' });
    }

    if (!(await getActiveResidentMembership(room_id, req.user.id))) {
      return res.status(403).json({ message: 'Only active Members can manage household tasks' });
    }

    const [assigneeRows] = await db.query(
      `SELECT u.id FROM users u
       INNER JOIN room_members rm ON rm.user_id = u.id
       INNER JOIN rooms r ON r.id = rm.room_id
       WHERE rm.room_id = ? AND rm.is_active = TRUE AND rm.user_id <> r.created_by AND u.name = ?`,
      [room_id, assigned_to],
    );
    if (assigneeRows.length === 0) {
      return res.status(400).json({ message: 'Choose a member of this room for the task' });
    }

    const [result] = await db.query(
      'INSERT INTO tasks (room_id, title, assigned_to, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [room_id, title.trim(), assigned_to, status || 'Pending', priority || 'Medium', due_date],
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: { id: result.insertId, room_id, title: title.trim(), assigned_to, status: status || 'Pending', priority: priority || 'Medium', due_date },
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Database error while creating task' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, assigned_to, status, due_date, priority } = req.body;

    const [taskRows] = await db.query('SELECT room_id FROM tasks WHERE id = ?', [id]);
    if (taskRows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!(await getActiveResidentMembership(taskRows[0].room_id, req.user.id))) {
      return res.status(403).json({ message: 'Only active Members can manage household tasks' });
    }

    const [assigneeRows] = await db.query(
      `SELECT u.id FROM users u
       INNER JOIN room_members rm ON rm.user_id = u.id
       INNER JOIN rooms r ON r.id = rm.room_id
       WHERE rm.room_id = ? AND rm.is_active = TRUE AND rm.user_id <> r.created_by AND u.name = ?`,
      [taskRows[0].room_id, assigned_to],
    );
    if (assigneeRows.length === 0) {
      return res.status(400).json({ message: 'Choose a member of this room for the task' });
    }

    await db.query(
      'UPDATE tasks SET title = ?, assigned_to = ?, status = ?, priority = ?, due_date = ? WHERE id = ?',
      [title.trim(), assigned_to, status || 'Pending', priority || 'Medium', due_date, id],
    );

    res.status(200).json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Database error while updating task' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const [taskRows] = await db.query('SELECT room_id FROM tasks WHERE id = ?', [id]);
    if (taskRows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!(await getActiveResidentMembership(taskRows[0].room_id, req.user.id))) {
      return res.status(403).json({ message: 'Only active Members can manage household tasks' });
    }

    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Database error while deleting task' });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask };
