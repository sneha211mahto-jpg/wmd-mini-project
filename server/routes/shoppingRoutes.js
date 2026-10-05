const express = require('express');
const { createShoppingItem, getShoppingItems, updateShoppingItem, deleteShoppingItem } = require('../controllers/shoppingController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, createShoppingItem);
router.get('/', authenticateToken, getShoppingItems);
router.put('/:id', authenticateToken, updateShoppingItem);
router.delete('/:id', authenticateToken, deleteShoppingItem);

module.exports = router;
