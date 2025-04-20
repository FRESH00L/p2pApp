var express = require('express');
var router = express.Router();
const db = require('../database/database');

/* GET home page. */
router.get('/', (req, res) => {
  if(!req.session.user){
    return res.render('login');
  }
  const userId = req.session.user.id;


  db.get('SELECT * FROM Users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).send('Error fetching user');
    }
    db.all('SELECT * FROM Cards WHERE cardHolder = ?', [userId], (err, cards) => {
      if (err) {
        console.error('Error fetching cards:', err);
        return res.status(500).send('Error fetching cards');
      }
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
      db.all(sql, [userId, userId], (err, transactions) => {
        if (err) {
          console.error('Error fetching transactions:', err);
          return res.status(500).send('Error fetching transactions');
        }
        res.render('userpage', {
          user: user,
          cards: cards,
          transactions: transactions
        });
      });
    });
  });
});
router.get('/topup', function(req, res, next) {
  const user = req.session.user;

  if (!user) {
    return res.redirect('/');
  }
  db.all('SELECT * FROM Cards WHERE cardHolder = ?', [user.id], (err, cards) => {
    if (err) {
      console.error('Error fetching cards:', err);
      return res.status(500).send('Error fetching cards');
    }
    res.render('topup', { user: user, cards: cards });
  });
});

router.get('/transaction', function(req, res, next) {
  const user = req.session.user; // Pobierz ID znajomego z zapytania
  if (!user) {
    return res.redirect('/'); // Przekierowanie na stronę główną, jeśli użytkownik nie jest zalogowany
  }
  const selectedFriendId =  req.query.friendId; // Pobierz ID znajomego z zapytania
  db.all(
    'SELECT Friends.friend_id, Users.name AS friend_name FROM Friends JOIN Users ON Friends.friend_id = Users.id WHERE Friends.user_id = ?',
    [user.id],
    (err, friends) => {
      if (err) {
        console.error('Error fetching friends:', err);
        return res.status(500).send('Error fetching friends');
      }
      if(selectedFriendId){
      res.render('transaction', { user: req.session.user, friends: friends, selectedFriendId: selectedFriendId });
      }
      else{
        res.render('transaction', { user: req.session.user, friends: friends });
      }
    }
  );
});
router.get('/logout', function(req, res, next) {
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Failed to destroy session');
      }
      res.redirect('/'); 
    });
  } else {
    return res.redirect('/'); 
  }
});

router.get('/register', function(req,res,next){
    console.log('Providing register');
    res.render('register');
})
router.get('/addCard', function(req,res,next){
  if(req.session.user){
  console.log('Providing add card');
  res.render('addCard');}
})

router.get('/friends', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/'); // Przekierowanie, jeśli użytkownik nie jest zalogowany
  }

  const userId = req.session.user.id;

  db.all(`SELECT 
  Friends.user_id, 
  Friends.friend_id, 
  Users.name AS friend_name
  FROM Friends
  JOIN Users ON Friends.friend_id = Users.id
  WHERE Friends.user_id = ?`, [userId],
    (err, friends) => {
      if (err) {
        console.error('Error fetching friends:', err.message);
        return res.status(500).send('Error fetching friends');
      }

      console.log('Fetched friends:', friends); // Logowanie wyników zapytania
      db.all(`SELECT Users.name AS friend_name, Users.id AS friend_id FROM Requests Join Users ON Requests.sender = Users.id WHERE Requests.reciver = ?`, [userId],
        (err, requests) => {
          if (err) {
            console.error('Error fetching requests:', err.message);
            return res.status(500).send('Error fetching requests');
          }
          console.log('Fetched requests:', requests); // Logowanie wyników zapytania
          
          console.log('Merged friends and requests:', friends, requests); // Logowanie wyników zapytania

      res.render('friends', { friends , user: req.session.user, requests}); // Renderowanie widoku z danymi znajomych
    }
  );
});
});

module.exports = router;
