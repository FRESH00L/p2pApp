const express = require('express');
const router = express.Router();
const db = require('../database/database');

router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.render('login');
  }
  if (req.session.user && req.session.user.role == 'admin') {
    return res.render('admin');
  }
  try {
    const userId = req.session.user.id;
    const user = await db.getAsync('SELECT * FROM Users WHERE id = ?', [userId]);
    const cards = await db.allAsync('SELECT * FROM Cards WHERE cardHolder = ?', [userId]);

    const sql = `
      SELECT Transactions.amount, Transactions.text, 
             sender.name AS sender_name, 
             receiver.name AS receiver_name
      FROM Transactions
      JOIN Users AS sender ON Transactions.sender_id = sender.id
      JOIN Users AS receiver ON Transactions.receiver_id = receiver.id
      WHERE sender.id = ? OR receiver.id = ?
      ORDER BY Transactions.id DESC;
    `;
    const transactions = await db.allAsync(sql, [userId, userId]);

    res.render('userpage', { user, cards, transactions });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Internal server error');
  }
});

router.get('/topup', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/');

  try {
    const cards = await db.allAsync('SELECT * FROM Cards WHERE cardHolder = ?', [user.id]);
    res.render('topup', { user, cards });
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).send('Error fetching cards');
  }
});

router.get('/transaction', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/');

  const selectedFriendId = req.query.friendId;

  try {
    const friends = await db.allAsync(
      'SELECT Friends.friend_id, Users.name AS friend_name FROM Friends JOIN Users ON Friends.friend_id = Users.id WHERE Friends.user_id = ?',
      [user.id]
    );
    res.render('transaction', { user, friends, selectedFriendId });
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).send('Error fetching friends');
  }
});

router.get('/logout', (req, res) => {
  if (req.session.user) {
    req.session.destroy(err => {
      if (err) return res.status(500).send('Failed to destroy session');
      res.redirect('/');
    });
  } else {
    res.redirect('/');
  }
});

router.get('/register', (req, res) => {
  console.log('Providing register');
  res.render('register');
});

router.get('/addCard', (req, res) => {
  if (req.session.user) {
    console.log('Providing add card');
    res.render('addCard');
  }
});

router.get('/newTransferRequest', (req, res) => {
  if (req.session.user) {
    const { friendId } = req.query;
    console.log('Providing new transfer request');
    res.render('newTransferRequest', { friend_id: friendId });
  } else {
    res.status(401).send('You have to be logged in to request transfer');
  }
});

router.get('/transferRequests', async (req, res) => {
  if (!req.session.user) return res.status(401).send('You have to be logged in to request transfer');

  try {
    console.log('Providing list of transfer requests');
    const requests = await db.allAsync(`
      SELECT tr.id, tr.requesting, tr.requested, tr.amount, tr.text, u.name AS friend_name
      FROM TransferRequests tr
      JOIN Users u ON u.id = tr.requesting
      WHERE tr.requested = ?
    `, [req.session.user.id]);

    res.render('transferRequests', { requests });
  } catch (err) {
    console.error('Error fetching transfer requests:', err.message);
    res.status(500).send('Error fetching transfer requests');
  }
});

router.get('/friends', async (req, res) => {
  if (!req.session.user) return res.redirect('/');

  const userId = req.session.user.id;

  try {
    const friends = await db.allAsync(`
      SELECT Friends.user_id, Friends.friend_id, Users.name AS friend_name
      FROM Friends
      JOIN Users ON Friends.friend_id = Users.id
      WHERE Friends.user_id = ?
    `, [userId]);

    const requests = await db.allAsync(`
      SELECT Users.name AS friend_name, Users.id AS friend_id
      FROM FriendRequests
      JOIN Users ON FriendRequests.sender = Users.id
      WHERE FriendRequests.reciver = ?
    `, [userId]);
    console.log('Providing list of friends', friends);
    console.log('Providing list of requests', requests);

    res.render('friends', { friends, user: req.session.user, requests });
  } catch (err) {
    console.error('Error fetching friends or requests:', err.message);
    res.status(500).send('Error fetching friends or requests');
  }
});
router.get('/split', async (req, res)=>{
  if(req.session.user){
    const userId = req.session.user.id;
    const friends = await db.allAsync(`
      SELECT Friends.friend_id, Users.name AS friend_name
      FROM Friends
      JOIN Users ON Friends.friend_id = Users.id
      WHERE Friends.user_id = ?
    `, [userId]);
    res.render('split', {friends});
  }
  else{
    res.status(401).send('You have to be logged in to split');
  }
});

module.exports = router;