const db = require('../config/db');

const synchronizeRoomRentExpense = async (connection, roomId, rentAmount, paidBy) => {
  const [rentRows] = await connection.query(
    `SELECT id FROM expenses
     WHERE room_id = ?
       AND (split_type = 'room_monthly_rent' OR (title = 'Rent' AND category = 'Rent'))
     ORDER BY CASE WHEN split_type = 'room_monthly_rent' THEN 0 ELSE 1 END, id
     LIMIT 1 FOR UPDATE`,
    [roomId],
  );

  if (rentRows.length > 0) {
    await connection.query(
      `UPDATE expenses
       SET title = 'Rent', amount = ?, category = 'Rent', paid_by = ?,
           split_type = 'room_monthly_rent', expense_date = COALESCE(expense_date, CURRENT_DATE())
       WHERE id = ?`,
      [rentAmount, paidBy, rentRows[0].id],
    );
  } else if (rentAmount > 0) {
    await connection.query(
      `INSERT INTO expenses (room_id, title, amount, category, paid_by, split_type, expense_date)
       VALUES (?, 'Rent', ?, 'Rent', ?, 'room_monthly_rent', CURRENT_DATE())`,
      [roomId, rentAmount, paidBy],
    );
  }
};

const getCurrentMembership = async (userId) => {
  const [rows] = await db.query('SELECT room_id FROM room_members WHERE user_id = ? AND is_active = TRUE LIMIT 1', [userId]);
  return rows[0] || null;
};

const createRoom = async (req, res) => {
  let connection;
  try {
    const { room_name, monthly_rent } = req.body;
    const rentAmount = Number(monthly_rent);

    if (!room_name?.trim() || !Number.isFinite(rentAmount) || rentAmount < 0) {
      return res.status(400).json({ message: 'Enter a room name and a valid monthly rent' });
    }

    const existingMembership = await getCurrentMembership(req.user.id);
    if (existingMembership) {
      return res.status(400).json({
        message: 'You are already a member of a room. Leave your current room before creating or joining another room.',
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO rooms (room_name, monthly_rent, created_by) VALUES (?, ?, ?)',
      [room_name.trim(), rentAmount, req.user.id],
    );
    const roomId = result.insertId;

    await connection.query('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)', [roomId, req.user.id]);

    const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await synchronizeRoomRentExpense(connection, roomId, rentAmount, users[0].name);

    await connection.commit();

    res.status(201).json({
      message: 'Room created successfully',
      room: { id: roomId, room_name: room_name.trim(), monthly_rent: rentAmount, created_by: req.user.id },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Database error while creating room' });
  } finally {
    connection?.release();
  }
};

const getRooms = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name AS created_by_name
       FROM rooms r
       INNER JOIN room_members rm ON rm.room_id = r.id
       LEFT JOIN users u ON u.id = r.created_by
      WHERE rm.user_id = ? AND rm.is_active = TRUE`,
      [req.user.id],
    );

    const rooms = await Promise.all(
      rows.map(async (room) => {
        const [members] = await db.query(
          `SELECT u.id, u.name, rm.is_active
           FROM room_members rm
           INNER JOIN users u ON u.id = rm.user_id
           INNER JOIN rooms r ON r.id = rm.room_id
           WHERE rm.room_id = ? AND rm.is_active = TRUE AND rm.user_id <> r.created_by`,
          [room.id],
        );

        return { ...room, members };
      }),
    );

    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Database error while fetching rooms' });
  }
};

const joinRoom = async (req, res) => {
  res.status(403).json({ message: 'Only the room Owner can add Members. Ask the Owner to invite you.' });
};

const getRemovedRoomMembers = async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, rm.removed_at
       FROM room_members rm
       INNER JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = ? AND rm.is_active = FALSE
       ORDER BY rm.removed_at DESC, u.name`,
      [roomId],
    );
    res.status(200).json({ members });
  } catch (error) {
    console.error('Get removed room members error:', error);
    res.status(500).json({ message: 'Database error while fetching removed members' });
  }
};

const addRoomMemberByEmail = async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!Number.isInteger(roomId) || roomId < 1 || !email) {
      return res.status(400).json({ message: 'A valid member email is required' });
    }

    const [rooms] = await db.query('SELECT id, created_by FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (Number(rooms[0].created_by) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Only the room owner can add members' });
    }

    const [users] = await db.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'No account found with this email. Ask the person to sign up first.' });
    }

    const member = users[0];
    if (Number(member.id) === Number(req.user.id)) {
      return res.status(400).json({ message: 'You cannot add yourself to the room.' });
    }

    const [existingMembership] = await db.query(
      'SELECT room_id FROM room_members WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [member.id],
    );
    if (existingMembership.length > 0) {
      if (Number(existingMembership.room_id) === Number(roomId)) {
        return res.status(409).json({ message: 'This user is already a member of this room.' });
      }
      return res.status(409).json({ message: 'This user is already a member of another room.' });
    }

    const [previousMembership] = await db.query(
      'SELECT id, is_active FROM room_members WHERE room_id = ? AND user_id = ? LIMIT 1',
      [roomId, member.id],
    );
    const restored = previousMembership.length > 0 && !previousMembership[0].is_active;
    if (restored) {
      await db.query(
        'UPDATE room_members SET is_active = TRUE, removed_at = NULL WHERE id = ?',
        [previousMembership[0].id],
      );
    } else if (previousMembership.length === 0) {
      await db.query('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)', [roomId, member.id]);
    }
    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, rm.is_active, (r.created_by = u.id) AS is_owner
       FROM room_members rm
       INNER JOIN users u ON u.id = rm.user_id
       INNER JOIN rooms r ON r.id = rm.room_id
      WHERE rm.room_id = ? AND rm.is_active = TRUE AND rm.user_id <> r.created_by`,
      [roomId],
    );

    res.status(201).json({
      message: restored ? `${member.name} was restored to the room` : `${member.name} was added to the room`,
      restored,
      member,
      members,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This user is already a member of the room.' });
    }
    console.error('Add room member error:', error);
    res.status(500).json({ message: 'Database error while adding room member' });
  }
};

const removeRoomMember = async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const targetUserId = Number(req.params.userId);

    if (!Number.isInteger(roomId) || roomId < 1 || !Number.isInteger(targetUserId) || targetUserId < 1) {
      return res.status(400).json({ message: 'A valid room and member ID are required' });
    }

    const [rooms] = await db.query('SELECT id, created_by FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (Number(req.user.id) !== Number(rooms[0].created_by)) {
      if (Number(targetUserId) === Number(req.user.id)) {
        return res.status(403).json({ message: 'Use Leave Room to remove yourself from this room.' });
      }
      return res.status(403).json({ message: 'Only the room owner can remove another member.' });
    }

    if (Number(targetUserId) === Number(rooms[0].created_by)) {
      return res.status(400).json({ message: 'The room owner cannot be removed from the room.' });
    }

    const [memberRows] = await db.query(
      `SELECT u.id, u.name
       FROM room_members rm
       INNER JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = ? AND rm.user_id = ? AND rm.is_active = TRUE`,
      [roomId, targetUserId],
    );

    if (memberRows.length === 0) {
      return res.status(404).json({ message: 'This member is not part of the room or has already been removed.' });
    }

    await db.query(
      'UPDATE room_members SET is_active = FALSE, removed_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ?',
      [roomId, targetUserId],
    );

    res.status(200).json({
      message: `${memberRows[0].name} was removed from the room`,
      removedUser: { id: memberRows[0].id, name: memberRows[0].name },
    });
  } catch (error) {
    console.error('Remove room member error:', error);
    res.status(500).json({ message: 'Database error while removing room member' });
  }
};

const leaveRoom = async (req, res) => {
  let connection;
  try {
    const { id: roomId } = req.params;
    const roomIdNum = Number(roomId);

    if (!Number.isInteger(roomIdNum) || roomIdNum < 1) {
      return res.status(400).json({ message: 'A valid room ID is required.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [roomRows] = await connection.query('SELECT id, created_by, monthly_rent FROM rooms WHERE id = ? FOR UPDATE', [roomIdNum]);
    if (roomRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Room not found' });
    }

    const [membershipRows] = await connection.query(
      'SELECT user_id FROM room_members WHERE room_id = ? AND is_active = TRUE ORDER BY id ASC',
      [roomIdNum],
    );

    const remainingMembers = membershipRows.filter((member) => Number(member.user_id) !== Number(req.user.id));
    const isOwner = Number(req.user.id) === Number(roomRows[0].created_by);

    if (!isOwner) {
      const [result] = await connection.query(
        'UPDATE room_members SET is_active = FALSE, removed_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ? AND is_active = TRUE',
        [roomIdNum, req.user.id],
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Room membership not found' });
      }

      await connection.commit();
      return res.status(200).json({ message: 'You have left the room successfully.' });
    }

    if (remainingMembers.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Add another active Member before transferring ownership and leaving.' });
    }

    const newOwnerId = Number(remainingMembers[0].user_id);
    await connection.query('UPDATE rooms SET created_by = ? WHERE id = ?', [newOwnerId, roomIdNum]);
    const [newOwnerRows] = await connection.query('SELECT name FROM users WHERE id = ?', [newOwnerId]);
    await synchronizeRoomRentExpense(connection, roomIdNum, Number(roomRows[0].monthly_rent), newOwnerRows[0].name);

    const [result] = await connection.query(
      'UPDATE room_members SET is_active = FALSE, removed_at = CURRENT_TIMESTAMP WHERE room_id = ? AND user_id = ? AND is_active = TRUE',
      [roomIdNum, req.user.id],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Room membership not found' });
    }

    await connection.commit();
    res.status(200).json({
      message: `You left the room and ownership was transferred to ${remainingMembers[0].user_id}.`,
      newOwnerId,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Database error while leaving room' });
  } finally {
    connection?.release();
  }
};

const updateRoom = async (req, res) => {
  let connection;
  try {
    const { room_name, monthly_rent } = req.body;
    const { id: roomId } = req.params;
    const rentAmount = Number(monthly_rent);

    if (!room_name?.trim() || !Number.isFinite(rentAmount) || rentAmount < 0) {
      return res.status(400).json({ message: 'Enter a room name and a valid monthly rent' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rooms] = await connection.query(
      'SELECT id FROM rooms WHERE id = ? AND created_by = ? FOR UPDATE',
      [roomId, req.user.id],
    );
    if (rooms.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Room not found or only the room owner can edit it' });
    }

    await connection.query(
      'UPDATE rooms SET room_name = ?, monthly_rent = ? WHERE id = ?',
      [room_name.trim(), rentAmount, roomId],
    );
    const [users] = await connection.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await synchronizeRoomRentExpense(connection, Number(roomId), rentAmount, users[0].name);
    await connection.commit();

    res.status(200).json({ message: 'Room updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Database error while updating room' });
  } finally {
    connection?.release();
  }
};

module.exports = { createRoom, getRooms, joinRoom, getRemovedRoomMembers, addRoomMemberByEmail, removeRoomMember, leaveRoom, updateRoom };
