const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (user, role) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, hashedPassword],
    );

    res.status(201).json({
      message: 'Account created successfully. Please login.',
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Database error while creating account' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!['owner', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Choose Owner Login or Member Login' });
    }

    const [memberships] = await db.query(
      `SELECT r.created_by
       FROM room_members rm
       INNER JOIN rooms r ON r.id = rm.room_id
       WHERE rm.user_id = ? AND rm.is_active = TRUE
       LIMIT 1`,
      [user.id],
    );
    const actualRole = memberships.length
      ? (Number(memberships[0].created_by) === Number(user.id) ? 'owner' : 'member')
      : null;

    if ((actualRole && role !== actualRole) || (!actualRole && role === 'member')) {
      return res.status(403).json({
        message: actualRole
          ? `This account is registered as a ${actualRole}. Choose the matching login option.`
          : 'Member access requires an active room invitation. Ask the Owner to add your account.',
      });
    }

    const userRole = actualRole || 'owner';
    const token = generateToken(user, userRole);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Database error while logging in' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, notifications_enabled FROM users WHERE id = ?',
      [req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const [roomRows] = await db.query(
      `SELECT r.* FROM rooms r
       INNER JOIN room_members rm ON rm.room_id = r.id
       WHERE rm.user_id = ? AND rm.is_active = TRUE LIMIT 1`,
      [req.user.id],
    );

    user.role = roomRows.length
      ? (Number(roomRows[0].created_by) === Number(user.id) ? 'owner' : 'member')
      : req.user.role || 'owner';
    res.status(200).json({ user, room: roomRows[0] || null });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Database error fetching user' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    await db.query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name.trim(), normalizedEmail, req.user.id],
    );
    const [rows] = await db.query(
      'SELECT id, name, email, notifications_enabled FROM users WHERE id = ?',
      [req.user.id],
    );

    res.status(200).json({ message: 'Profile updated successfully', user: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That email address is already registered' });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Database error while updating profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'Please fill in all password fields' });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await bcrypt.compare(current_password, rows[0].password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Database error while changing password' });
  }
};

const updateNotifications = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: 'Notification setting must be true or false' });
    }

    await db.query('UPDATE users SET notifications_enabled = ? WHERE id = ?', [enabled, req.user.id]);
    res.status(200).json({ message: 'Notification settings saved', notifications_enabled: enabled });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ message: 'Database error while saving notification settings' });
  }
};

module.exports = { signup, login, getCurrentUser, updateProfile, changePassword, updateNotifications };
