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

  res.render('topup', { user: user });
});

router.get('/transaction', function(req,res,next) {
  if(req.session.user){
      res.render('transaction', {user: req.session.user});
  }else{
    return res.redirect('/');
  }
})
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
module.exports = router;
