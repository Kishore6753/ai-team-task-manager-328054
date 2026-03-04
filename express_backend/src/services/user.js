const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * UserService manages user registration, authentication, and fetching.
 * Contract:
 * - registerUser(input): {username, password, email} => User object or throws error
 * - authenticateUser(input): {username/email, password} => JWT token or throws error
 * - getUserById(id): id => User or null
 */

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRE = '1d';

// PUBLIC_INTERFACE
async function registerUser({ username, password, email }) {
  /** Register a new user; returns user object without password hash. Throws on duplicate. */
  if (!username || !password || !email) throw new Error('Missing fields');
  const hash = await bcrypt.hash(password, 10);
  try {
    const res = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hash]
    );
    return res.rows[0];
  } catch (err) {
    if (err.message && err.message.includes('unique')) {
      throw new Error('Username or email already exists');
    }
    throw err;
  }
}

// PUBLIC_INTERFACE
async function authenticateUser({ usernameOrEmail, password }) {
  /** Authenticate user by username/email and password, returns JWT on success. */
  const res = await db.query(
    'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
    [usernameOrEmail]
  );
  const user = res.rows[0];
  if (!user) throw new Error('User not found');
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new Error('Invalid password');
  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  return { token, user: { id: user.id, username: user.username, email: user.email } };
}

// PUBLIC_INTERFACE
async function getUserById(id) {
  /** Get user by ID, returns user object or null. */
  const res = await db.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

module.exports = { registerUser, authenticateUser, getUserById };
