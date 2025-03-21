var express = require('express');
var router = express.Router();
const db = require('../database/database');

/* GET home page. */
router.get('/', function(req, res, next) {
  if(!req.session.user){
  res.render('login', { title: 'Login' });
  }else{
      const userId = req.session.user.id;
    
      db.all(
        `SELECT t.id, t.amount, t.text, t.sender_id, t.receiver_id, 
                s.name AS sender_name, r.name AS receiver_name 
         FROM Transactions t
         LEFT JOIN Users s ON t.sender_id = s.id
         LEFT JOIN Users r ON t.receiver_id = r.id
         WHERE t.sender_id = ? OR t.receiver_id = ?
         ORDER BY t.id DESC`,
        [userId, userId],
        (err, transactions) => {
            if (err) {
                console.error('Error fetching transactions:', err);
                return res.status(500).send('Error fetching transactions');
            }

            res.render('userpage', { user: req.session.user, transactions });
        }
    );
  }
});
router.get('/topup', function(req, res, next) {
  const user = req.session.user;

  // Sprawdź, czy użytkownik jest zalogowany
  if (!user) {
    return res.redirect('/login'); // Jeśli nie, przekieruj do strony logowania
  }

  res.render('topup', { user: user }); // Przekazuj obiekt 'user' do widoku
});

router.get('/transaction', function(req,res,next) {
  if(req.session.user){
      res.render('transaction', {user: req.session.user});
  }else{
    return res.redirect('/login');
  }
})
router.get('/logout', function(req,res,next){
  if(req.session.user){
    req.session.destroy(req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Failed to destroy session');
      }
      res.redirect('/');
    }));
}else{
  return res.redirect('/');
}
})
module.exports = router;
