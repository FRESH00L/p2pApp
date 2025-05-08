const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Pomocnicze sprawdzenie istnienia użytkownika
async function getUserIdByName(name) {
  return db.getAsync('SELECT id FROM Users WHERE name = ?', [name]);
}

async function friendshipExists(userId, friendId) {
  return db.getAsync(
    `SELECT * FROM Friends 
     WHERE (user_id = ? AND friend_id = ?) 
        OR (user_id = ? AND friend_id = ?)`,
    [userId, friendId, friendId, userId]
  );
}

router.post('/addFriend', async (req, res) => {
  const { friendName } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !friendName) {
    return res.status(400).send('User ID and Friend name are required.');
  }

  try {
    const friend = await getUserIdByName(friendName);
    if (!friend) {
      console.log(`User ${friendName} not found`);
      return res.status(404).send('Friend not found');
    }

    const friendId = friend.id;
    const existingFriendship = await friendshipExists(userId, friendId);

    if (existingFriendship) {
      console.log(`Friendship already exists between ${userId} and ${friendId}`);
      return res.status(400).send('Friendship already exists');
    }

    await db.runAsync(
      'INSERT INTO FriendRequests (sender, reciver) VALUES (?, ?)',
      [userId, friendId]
    );

    console.log(`Friend request sent from ${userId} to ${friendId}`);
    res.send('Friend request sent');
  } catch (err) {
    console.error('Error adding friend:', err.message);
    res.status(500).send('Internal server error');
  }
});

router.post('/acceptFriend', async (req, res) => {
  const { friendId } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !friendId) {
    return res.status(400).send('Invalid request');
  }

  try {
    const result = await db.runAsync(
      'INSERT OR IGNORE INTO Friends (user_id, friend_id) VALUES (?, ?)',
      [friendId, userId]
    );

    await db.runAsync(
      'INSERT OR IGNORE INTO Friends (user_id, friend_id) VALUES (?, ?)',
      [userId, friendId]
    );

    await db.runAsync(
      'DELETE FROM FriendRequests WHERE sender = ? AND reciver = ?',
      [friendId, userId]
    );

    console.log(`Friendship between ${userId} and ${friendId} created`);
    res.redirect('/friends');
  } catch (err) {
    console.error('Error accepting friend:', err.message);
    res.status(500).send('Error accepting friend');
  }
});

router.post('/rejectFriend', async (req, res) => {
  const { friendId } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !friendId) {
    return res.status(400).send('Invalid request');
  }

  try {
    await db.runAsync(
      'DELETE FROM FriendRequests WHERE sender = ? AND reciver = ?',
      [friendId, userId]
    );
    console.log(`Friend request from ${friendId} to ${userId} rejected`);
    res.redirect('/friends');
  } catch (err) {
    console.error('Error rejecting friend:', err.message);
    res.status(500).send('Error rejecting friend');
  }
});

router.post('/delete', async (req, res) => {
  const { friendId } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !friendId) {
    return res.status(400).send('Invalid request');
  }

  try {
    await db.runAsync(
      'DELETE FROM Friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );
    console.log(`Friendship between ${userId} and ${friendId} deleted`);
    res.redirect('/friends');
  } catch (err) {
    console.error('Error deleting friend:', err.message);
    res.status(500).send('Error deleting friend');
  }
});

module.exports = router;
