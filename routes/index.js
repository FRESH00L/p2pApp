var express = require('express');
var router = express.Router();
const db = require('../database/database');

/* GET home page. */
router.get('/', (req, res) => {
  if(!req.session.user){
    return res.render('login');
  }
  const userId = req.session.user.id; // Zakładając, że użytkownik jest zalogowany i mamy jego ID w sesji

  // Pobierz użytkownika z bazy danych
  db.get('SELECT * FROM Users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).send('Error fetching user');
    }

    // Pobierz karty tego użytkownika
    db.all('SELECT * FROM Cards WHERE cardHolder = ?', [userId], (err, cards) => {
      if (err) {
        console.error('Error fetching cards:', err);
        return res.status(500).send('Error fetching cards');
      }

      // Pobierz transakcje (jeśli chcesz je także wyświetlić)
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

        // Renderuj widok Pug i przekaż dane
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

  // Sprawdź, czy użytkownik jest zalogowany
  if (!user) {
    return res.redirect('/'); // Jeśli nie, przekieruj do strony logowania
  }

  res.render('topup', { user: user }); // Przekazuj obiekt 'user' do widoku
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
    req.session.destroy((err) => {  // Usuwamy podwójne wywołanie destroy
      if (err) {
        return res.status(500).send('Failed to destroy session');
      }
      res.redirect('/');  // Przekierowanie po zakończeniu
    });
  } else {
    return res.redirect('/');  // Jeśli brak sesji użytkownika, przekierowujemy
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
