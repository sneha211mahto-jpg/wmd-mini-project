const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
};

const requireRoomOwner = async (req, res, next) => {
  const roomId = Number(req.params.roomId || req.params.id);
  if (!Number.isInteger(roomId) || roomId < 1) {
    return res.status(400).json({ message: 'A valid room ID is required' });
  }

  try {
    const [rooms] = await db.query(
      `SELECT r.id
       FROM rooms r
       INNER JOIN room_members rm ON rm.room_id = r.id
         AND rm.user_id = r.created_by AND rm.is_active = TRUE
       WHERE r.id = ? AND r.created_by = ?`,
      [roomId, req.user.id],
    );
    if (rooms.length === 0) {
      return res.status(403).json({ message: 'Only the active room Owner can manage room members or settings' });
    }
    next();
  } catch (error) {
    console.error('Room owner authorization error:', error);
    res.status(500).json({ message: 'Database error while checking room permissions' });
  }
};

module.exports = { authenticateToken, requireRoomOwner };
