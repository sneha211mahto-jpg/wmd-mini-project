const db = require('../config/db');

const getActiveResidentMembership = async (roomId, userId) => {
  const [rows] = await db.query(
    `SELECT u.name
     FROM room_members rm
     INNER JOIN rooms r ON r.id = rm.room_id
     INNER JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = ? AND rm.user_id = ? AND rm.is_active = TRUE
       AND r.created_by <> rm.user_id`,
    [roomId, userId],
  );
  return rows[0] || null;
};

const getShoppingItems = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT si.*
       FROM shopping_items si
       INNER JOIN room_members rm ON rm.room_id = si.room_id
      WHERE rm.user_id = ? AND rm.is_active = TRUE
       ORDER BY si.created_at DESC`,
      [req.user.id],
    );

    res.status(200).json({ shoppingItems: rows });
  } catch (error) {
    console.error('Get shopping items error:', error);
    res.status(500).json({ message: 'Database error while fetching shopping items' });
  }
};

const createShoppingItem = async (req, res) => {
  try {
    const { room_id, item_name, quantity, status } = req.body;

    if (!room_id || !item_name || !quantity) {
      return res.status(400).json({ message: 'Please fill in all shopping item fields' });
    }

    const member = await getActiveResidentMembership(room_id, req.user.id);
    if (!member) {
      return res.status(403).json({ message: 'Only active Members can manage the shopping list' });
    }

    const [result] = await db.query(
      'INSERT INTO shopping_items (room_id, item_name, quantity, added_by, status) VALUES (?, ?, ?, ?, ?)',
      [room_id, item_name, quantity, member.name, status || 'Pending'],
    );

    res.status(201).json({
      message: 'Shopping item added successfully',
      item: { id: result.insertId, room_id, item_name, quantity, added_by: member.name, status: status || 'Pending' },
    });
  } catch (error) {
    console.error('Create shopping item error:', error);
    res.status(500).json({ message: 'Database error while creating shopping item' });
  }
};

const updateShoppingItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, quantity, status } = req.body;

    const [itemRows] = await db.query('SELECT room_id FROM shopping_items WHERE id = ?', [id]);
    if (itemRows.length === 0) {
      return res.status(404).json({ message: 'Shopping item not found' });
    }

    const member = await getActiveResidentMembership(itemRows[0].room_id, req.user.id);
    if (!member) {
      return res.status(403).json({ message: 'Only active Members can manage the shopping list' });
    }

    await db.query(
      'UPDATE shopping_items SET item_name = ?, quantity = ?, status = ?, added_by = ? WHERE id = ?',
      [item_name, quantity, status || 'Pending', member.name, id],
    );

    res.status(200).json({ message: 'Shopping item updated successfully' });
  } catch (error) {
    console.error('Update shopping item error:', error);
    res.status(500).json({ message: 'Database error while updating shopping item' });
  }
};

const deleteShoppingItem = async (req, res) => {
  try {
    const { id } = req.params;

    const [itemRows] = await db.query('SELECT room_id FROM shopping_items WHERE id = ?', [id]);
    if (itemRows.length === 0) {
      return res.status(404).json({ message: 'Shopping item not found' });
    }

    if (!(await getActiveResidentMembership(itemRows[0].room_id, req.user.id))) {
      return res.status(403).json({ message: 'Only active Members can manage the shopping list' });
    }

    await db.query('DELETE FROM shopping_items WHERE id = ?', [id]);
    res.status(200).json({ message: 'Shopping item deleted successfully' });
  } catch (error) {
    console.error('Delete shopping item error:', error);
    res.status(500).json({ message: 'Database error while deleting shopping item' });
  }
};

module.exports = { createShoppingItem, getShoppingItems, updateShoppingItem, deleteShoppingItem };
