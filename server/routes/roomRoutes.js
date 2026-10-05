const express = require('express');
const { createRoom, getRooms, joinRoom, getRemovedRoomMembers, addRoomMemberByEmail, removeRoomMember, leaveRoom, updateRoom } = require('../controllers/roomController');
const { authenticateToken, requireRoomOwner } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, createRoom);
router.get('/', authenticateToken, getRooms);
router.post('/join', authenticateToken, joinRoom);
router.get('/:roomId/removed-members', authenticateToken, requireRoomOwner, getRemovedRoomMembers);
router.post('/:roomId/members', authenticateToken, requireRoomOwner, addRoomMemberByEmail);
router.delete('/:id/members/me', authenticateToken, leaveRoom);
router.delete('/:roomId/members/:userId', authenticateToken, requireRoomOwner, removeRoomMember);
router.put('/:id', authenticateToken, requireRoomOwner, updateRoom);

module.exports = router;
