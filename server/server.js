const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const taskRoutes = require('./routes/taskRoutes');
const shoppingRoutes = require('./routes/shoppingRoutes');

dotenv.config({ path: require('path').join(__dirname, '.env') });

if (!process.env.JWT_SECRET?.trim()) {
  process.env.JWT_SECRET = require('crypto').randomBytes(64).toString('hex');
  console.warn('JWT_SECRET is blank. A temporary secret was generated; existing sessions expire when the backend restarts.');
}

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

const initializeDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
  await connection.end();

  const db = require('./config/db');
  const schema = require('fs').readFileSync(require('path').join(__dirname, 'schema.sql'), 'utf8');
  await db.query(schema);

  const [notificationColumn] = await db.query("SHOW COLUMNS FROM users LIKE 'notifications_enabled'");
  if (notificationColumn.length === 0) {
    await db.query('ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE');
  }

  const [expenseDateColumn] = await db.query("SHOW COLUMNS FROM expenses LIKE 'expense_date'");
  if (expenseDateColumn.length === 0) {
    await db.query('ALTER TABLE expenses ADD COLUMN expense_date DATE');
  }

  const [taskPriorityColumn] = await db.query("SHOW COLUMNS FROM tasks LIKE 'priority'");
  if (taskPriorityColumn.length === 0) {
    await db.query("ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'Medium'");
  }

  const [membershipActiveColumn] = await db.query("SHOW COLUMNS FROM room_members LIKE 'is_active'");
  if (membershipActiveColumn.length === 0) {
    await db.query('ALTER TABLE room_members ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE');
  }

  const [membershipRemovedAtColumn] = await db.query("SHOW COLUMNS FROM room_members LIKE 'removed_at'");
  if (membershipRemovedAtColumn.length === 0) {
    await db.query('ALTER TABLE room_members ADD COLUMN removed_at TIMESTAMP NULL DEFAULT NULL');
  }

  const [roomsWithRent] = await db.query(
    `SELECT r.id, r.monthly_rent, u.name AS owner_name
     FROM rooms r
     INNER JOIN users u ON u.id = r.created_by
     WHERE r.monthly_rent > 0
       AND NOT EXISTS (
         SELECT 1 FROM expenses e
         WHERE e.room_id = r.id AND e.split_type = 'room_monthly_rent'
       )`,
  );

  for (const room of roomsWithRent) {
    const [existingRent] = await db.query(
      `SELECT id FROM expenses
       WHERE room_id = ? AND title = 'Rent' AND category = 'Rent'
       ORDER BY id LIMIT 1`,
      [room.id],
    );

    if (existingRent.length > 0) {
      await db.query(
        `UPDATE expenses
         SET amount = ?, paid_by = ?, split_type = 'room_monthly_rent',
             expense_date = COALESCE(expense_date, CURRENT_DATE())
         WHERE id = ?`,
        [room.monthly_rent, room.owner_name, existingRent[0].id],
      );
    } else {
      await db.query(
        `INSERT INTO expenses (room_id, title, amount, category, paid_by, split_type, expense_date)
         VALUES (?, 'Rent', ?, 'Rent', ?, 'room_monthly_rent', CURRENT_DATE())`,
        [room.id, room.monthly_rent, room.owner_name],
      );
    }
  }
};

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/shopping', shoppingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'RoomMate backend is running' });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`RoomMate backend running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
