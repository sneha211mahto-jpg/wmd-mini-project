const db = require('../config/db');

const verifyExpenseAccess = async (roomId, userId, paidBy) => {
  const [memberships] = await db.query(
    `SELECT r.created_by
     FROM rooms r
     INNER JOIN room_members rm ON rm.room_id = r.id
       AND rm.user_id = ? AND rm.is_active = TRUE
     WHERE r.id = ?`,
    [userId, roomId],
  );
  if (memberships.length === 0) return { error: 'You are not an active member of this room' };

  const [payers] = await db.query(
    `SELECT u.id
     FROM room_members rm
     INNER JOIN users u ON u.id = rm.user_id
     INNER JOIN rooms r ON r.id = rm.room_id
     WHERE rm.room_id = ? AND rm.is_active = TRUE
       AND rm.user_id <> r.created_by AND LOWER(u.name) = LOWER(?)
       AND NOT EXISTS (
         SELECT 1 FROM users owner
         WHERE owner.id = r.created_by AND LOWER(owner.name) = LOWER(?)
       )
     LIMIT 1`,
    [roomId, paidBy.trim(), paidBy.trim()],
  );
  if (payers.length === 0) return { error: 'Expenses must be paid by an active Member, not the Owner' };
  return {};
};

const getExpenses = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*
       FROM expenses e
      INNER JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = ? AND rm.is_active = TRUE
       ORDER BY e.created_at DESC`,
      [req.user.id],
    );

    res.status(200).json({ expenses: rows });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Database error while fetching expenses' });
  }
};

const createExpense = async (req, res) => {
  try {
    const { room_id, title, amount, category, paid_by, split_type, date } = req.body;

    if (!room_id || typeof title !== 'string' || !title.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0
      || typeof category !== 'string' || !category.trim() || typeof paid_by !== 'string' || !paid_by.trim()) {
      return res.status(400).json({ message: 'Please fill in all expense fields' });
    }
    if (split_type && split_type !== 'equal') {
      return res.status(400).json({ message: 'Only equal expense splitting is supported' });
    }

    const access = await verifyExpenseAccess(room_id, req.user.id, paid_by);
    if (access.error) return res.status(403).json({ message: access.error });

    const [result] = await db.query(
      'INSERT INTO expenses (room_id, title, amount, category, paid_by, split_type, expense_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [room_id, title.trim(), amount, category, paid_by, split_type || 'equal', date || null],
    );

    res.status(201).json({
      message: 'Expense added successfully',
      expense: { id: result.insertId, room_id, title: title.trim(), amount, category, paid_by, split_type: split_type || 'equal', expense_date: date || null },
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Database error while creating expense' });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, paid_by, split_type, date } = req.body;

    if (typeof title !== 'string' || !title.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0
      || typeof category !== 'string' || !category.trim() || typeof paid_by !== 'string' || !paid_by.trim()) {
      return res.status(400).json({ message: 'Please fill in all expense fields' });
    }
    if (split_type && split_type !== 'equal') {
      return res.status(400).json({ message: 'Only equal expense splitting is supported' });
    }

    const [expenseRows] = await db.query('SELECT room_id, split_type FROM expenses WHERE id = ?', [id]);
    if (expenseRows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expenseRows[0].split_type === 'room_monthly_rent') {
      return res.status(403).json({ message: 'Room rent is managed by the Owner in room settings' });
    }
    const access = await verifyExpenseAccess(expenseRows[0].room_id, req.user.id, paid_by);
    if (access.error) return res.status(403).json({ message: access.error });

    await db.query(
      'UPDATE expenses SET title = ?, amount = ?, category = ?, paid_by = ?, split_type = ?, expense_date = ? WHERE id = ?',
      [title.trim(), amount, category, paid_by, split_type || 'equal', date || null, id],
    );

    res.status(200).json({ message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Database error while updating expense' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const [expenseRows] = await db.query('SELECT room_id, split_type FROM expenses WHERE id = ?', [id]);
    if (expenseRows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expenseRows[0].split_type === 'room_monthly_rent') {
      return res.status(403).json({ message: 'Room rent is managed by the Owner in room settings' });
    }
    const [memberRows] = await db.query(
      'SELECT id FROM room_members WHERE room_id = ? AND user_id = ? AND is_active = TRUE',
      [expenseRows[0].room_id, req.user.id],
    );
    if (memberRows.length === 0) {
      return res.status(403).json({ message: 'Unauthorized delete' });
    }

    await db.query('DELETE FROM expenses WHERE id = ?', [id]);
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Database error while deleting expense' });
  }
};

module.exports = { createExpense, getExpenses, updateExpense, deleteExpense };
