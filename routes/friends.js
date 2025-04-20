var express = require('express');
var router = express.Router();
const db = require('../database/database');
const { render } = require('pug');


router.post('/addFriend', (req, res) => {
    const { friendName } = req.body;
    const userId = req.session.user.id;
  
    if (!userId || !friendName) {
        return res.status(400).send('User ID and Friend ID are required.');
    }
  db.get('Select Users.id FROM Users where name = ?', [friendName], (err, row) => {
      if (err) {
          console.error('Error fetching friend ID:', err.message);
          return res.status(500).send('Error fetching friend ID');
      }
  
      if (!row) {
          console.log(`User ${friendName} does not exist`);
          return res.status(404).send('Friend not found');
      }
  
      const friendId = row.id;
      console.log(`Friend ID: ${friendId}`);
  
      // Sprawdzamy, czy znajomość już istnieje w jednym z kierunków (user -> friend)
      db.get('SELECT * FROM Friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', 
      [userId, friendId, friendId, userId], (err, row) => {
        if (err) {
            console.error('Error checking friendship:', err.message);
            return res.status(500).send('Error checking friendship');
        }
  
        if (row) {
            console.log(`Friendship already exists between user ${userId} and friend ${friendId}`);
            return res.status(400).send('Friendship already exists');
        }
  
        // Jeśli znajomość nie istnieje, dodajemy ją w obu kierunkach
        db.serialize(() => {
          db.run('INSERT INTO Requests (sender, reciver) VALUES (?, ?)', [userId, friendId], function(err) {
              if (err) {
                  console.error('Error adding friend (user -> friend):', err.message);
                  return res.status(500).send('Error adding friend (user -> friend)');
              }
              console.log(`Friend with ID ${friendId} added to user with ID ${userId}`);
          });
              res.send('Friend added successfully');
          });
        });
    });
  });

router.post('/acceptFriend', (req, res) => {
    const { friendId } = req.body;
    const userId = req.session.user?.id;
  
    if (!friendId || !userId) {
      console.error('Missing friendId or userId');
      return res.status(400).send('Invalid request');
    }
  
    console.log('Accepting friend request:', { friendId, userId });
  
    db.serialize(() => {
      db.run('INSERT OR IGNORE INTO Friends (user_id, friend_id) VALUES (?, ?)', [friendId, userId], function(err) {
        if (err) {
          console.error('Error updating friend request:', err.message);
          return res.status(500).send('Error accepting friend');
        }
  
        console.log(`Rows created: ${this.changes}`);
        if (this.changes === 0) {
          return res.status(404).send('Friend request not found');
        }
  
        db.run('INSERT OR IGNORE INTO Friends (user_id, friend_id) VALUES (?, ?)', [userId, friendId], function(err) {
          if (err) {
            console.error('Error creating reciprocal friendship:', err.message);
            return res.status(500).send('Error creating reciprocal friendship');
          }
          console.log('Reciprocal friendship created');
          res.redirect('/friends');

          db.run('DELETE FROM Requests WHERE sender = ? AND reciver = ?', [friendId, userId], function(err) {
            if (err) {
              console.error('Error deleting friend request:', err.message);
              return res.status(500).send('Error deleting friend request');
            }
            console.log(`Friend request from ${friendId} to ${userId} deleted`);
          });
        });
      });
    });
  });
  
  
  // Odrzuć zaproszenie
  router.post('/rejectFriend', (req, res) => {
    const { friendId } = req.body;
    const userId = req.session.user.id;
  
    db.run('DELETE FROM Requests WHERE sender = ? AND reciver = ?', [friendId, userId], function(err) {
      if (err) {
        console.error('Error rejecting friend request:', err.message);
        return res.status(500).send('Error rejecting friend');
      }

        res.redirect('/friends');
      });
    });

router.post('/delete', (req,res)=>{
    const {friendId} = req.body;
    const userId = req.session.user.id;

    db.run('DELETE FROM Friends WHERE (user_id = ? AND friend_id =?) OR (user_id = ? AND friend_id = ?)', [userId, friendId, friendId, userId], function(err) {
        if (err) {
            console.error('Error deleting friend:', err.message);
            return res.status(500).send('Error deleting friend');
        }
        console.log(`Friend with ID ${friendId} deleted`);
        res.redirect('/friends');
    });
});
module.exports = router;