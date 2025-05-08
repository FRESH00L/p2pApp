const express = require('express');
const router = express.Router();
const db = require('../database/database');
const { promisify } = require('util');

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

const requireLogin = (req, res) => {
  if (!req.session.user) {
    res.status(401).send("You have to be logged in");
    return false;
  }
  return true;
};

// POST /addRequest
router.post('/addRequest', async (req, res) => {
  if (!requireLogin(req, res)) return;

  const { amount, text, friendId } = req.body;
  const requesting_id = req.session.user.id;

  if (amount <= 0) {
    return res.status(400).send("Invalid amount");
  }

  try {
    await dbRun(`INSERT INTO TransferRequests (requesting, requested, amount, text) VALUES (?, ?, ?, ?)`, [requesting_id, friendId, amount, text]);
    console.log("Created transfer request");
    res.redirect('/');
  } catch (err) {
    console.error('Error while creating transfer request:', err);
    res.status(500).send('Error while creating transfer request');
  }
});

// POST /acceptRequest
router.post('/acceptRequest', async (req, res) => {
  if (!requireLogin(req, res)) return;

  const requested_id = req.session.user.id;
  const requesting_id = req.body.friendId;
  const request_id = req.body.requestId;

  try {
    const request = await dbGet(`SELECT * FROM TransferRequests WHERE requesting = ? AND requested = ? AND id = ?`, [requesting_id, requested_id, request_id]);
    if (!request) return res.status(404).send("Request not found");

    const { amount, text } = request;
    const user = await dbGet('SELECT balance FROM Users WHERE id = ?', [requested_id]);
    if (!user || user.balance < amount) {
      return res.status(400).send('Insufficient balance');
    }

    db.serialize(async () => {
      try {
        await dbRun('BEGIN TRANSACTION');
        await dbRun('UPDATE Users SET balance = balance - ? WHERE id = ?', [amount, requested_id]);
        await dbRun('UPDATE Users SET balance = balance + ? WHERE id = ?', [amount, requesting_id]);
        await dbRun('INSERT INTO Transactions (amount, text, sender_id, receiver_id) VALUES (?, ?, ?, ?)', [amount, text, requested_id, requesting_id]);
        await dbRun('DELETE FROM TransferRequests WHERE requesting = ? AND requested = ? AND id = ?', [requesting_id, requested_id, request_id]);
        await dbRun('COMMIT');

        req.session.user.balance -= amount;
        res.redirect('/transferRequests');
      } catch (err) {
        console.error('Transaction error:', err);
        db.run('ROLLBACK');
        res.status(500).send("Transaction failed");
      }
    });

  } catch (err) {
    console.error('Error accepting request:', err);
    res.status(500).send("Error processing request");
  }
});

// POST /rejectRequest
router.post('/rejectRequest', async (req, res) => {
  if (!requireLogin(req, res)) return;

  const requested_id = req.session.user.id;
  const requesting_id = req.body.friendId;
  const request_id = req.body.requestId;

  try {
    await dbRun('DELETE FROM TransferRequests WHERE requesting = ? AND requested = ? AND id = ?', [requesting_id, requested_id, request_id]);
    res.redirect('/transferRequests');
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).send("Error rejecting request");
  }
});

router.post('/split', async (req,res)=>{
    if(!requireLogin(req, res)) return;
    const {amount, text, friends} = req.body;
    if(friends == null) return res.status(400).send("No friends selected");
    const userId = req.session.user.id;
    console.log("Splitting amount", amount, "between", friends);
    const splitAmount = amount / (friends.length + 1);

    try{
        db.serialize(async () => {
            await dbRun('BEGIN TRANSACTION');
            for (const friendId of friends) {
                await dbRun('INSERT INTO TransferRequests (requesting, requested, amount, text) VALUES (?, ?, ?, ?)',
                    [userId, friendId, splitAmount, text]
                );
                console.log("Created transfer request for", friendId);
            }
            await dbRun('COMMIT');
            res.redirect('/');
        })
    }catch(err){
        console.error('Error while creating split transfer requests:', err);
        db.run('ROLLBACK');
        res.status(500).send('Error while creating split transfer requests');
    }
});

// POST /new (Create transaction)
router.post('/new', async (req, res) => {
  if (!requireLogin(req, res)) return;

  const { password, amount, text, receiver_id } = req.body;
  const sender_id = req.session.user.id;

  if (amount <= 0) {
    return res.status(400).send("Invalid amount");
  }

  try {
    const reciver = await dbGet('SELECT * FROM Users WHERE password = ?', [password]);
    if (!reciver) {
      return res.status(404).send('Password not valid');
    }

    const sender = await dbGet('SELECT balance FROM Users WHERE id = ?', [sender_id]);
    if (!sender || sender.balance < amount) {
      return res.status(400).send('Insufficient balance');
    }

    db.serialize(async () => {
      try {
        await dbRun('BEGIN TRANSACTION');
        await dbRun('UPDATE Users SET balance = balance - ? WHERE id = ?', [amount, sender_id]);
        await dbRun('UPDATE Users SET balance = balance + ? WHERE id = ?', [amount, receiver_id]);
        await dbRun('INSERT INTO Transactions (amount, text, sender_id, receiver_id) VALUES (?, ?, ?, ?)', [amount, text, sender_id, receiver_id]);
        await dbRun('COMMIT');

        req.session.user.balance -= amount;
        res.redirect('/');
      } catch (err) {
        console.error('Transaction error:', err);
        db.run('ROLLBACK');
        res.status(500).send('Transaction failed');
      }
    });

  } catch (err) {
    console.error('Error processing transaction:', err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
