const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { promisify } = require('util');

// Promisify database methods
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));

// POST /login
router.post('/login', async (req, res) => {
  const { name, password } = req.body;

  try {
    const user = await dbGet('SELECT * FROM Users WHERE name = ? AND password = ?', [name, password]);

    if (!user) {
      return res.status(401).send('Invalid username or password');
    }
    if(user.role == 'user') {
    req.session.user = {
      id: user.id,
      name: user.name,
      balance: user.balance,
      cardNumber: user.cardNumber,
      cvv: user.cvv,
      cardHolder: user.cardHolder,
      role: user.role,
      };
    } else if (user.role == 'admin') {
      req.session.user = {
        id: user.id,
        name: user.name,
        role: user.role,
      };
    }

    res.redirect('/');
  } catch (err) {
    console.error('Error checking user:', err);
    res.status(500).send('Internal server error');
  }
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error destroying session');
    }

    res.redirect('/login');
  });
});

// POST /register
router.post('/register', async (req, res) => {
  const { username, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const user = await dbGet('SELECT * FROM Users WHERE name = ?', [username]);

    if (user) {
      console.log(`User ${username} already exists`);
      return res.redirect('/');
    }

    await dbRun('INSERT INTO Users (name, password) VALUES (?, ?)', [username, password]);

    console.log(`User created: ${username}`);
    res.redirect('/');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).send('Internal server error');
  }
});

// GET /users
router.get('/', async (req, res) => {
  try {
    const users = await dbAll('SELECT * FROM Users');
    res.json(users);
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).send('Internal server error');
  }
});

// POST /delete
router.post('/delete', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send('User id is required.');
  }

  try {
    await dbRun('DELETE FROM Users WHERE id = ?', [userId]);
    console.log(`User with ID ${userId} deleted`);
    res.send('User deleted successfully');
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
