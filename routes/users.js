var express = require('express');
var router = express.Router();
const db = require('../database/database');
const { render } = require('pug');
const e = require('express');

//Login
router.post('/login', (req,res)=>{
  const{name, password, body} = req.body;
  db.get('SELECT * FROM Users WHERE name = ? AND password = ?', [name, password], (err, user)=>{
    if(err){
      console.error('Error checking user:', err);
      return res.status(500).send('Error checking user');
    }
    if(user){
      req.session.user ={
        id: user.id,
        name: user.name,
        balance: user.balance,
        cardNumber: user.cardNumber,
        cvv: user.cvv,
        cardHolder: user.cardHolder,
      };
      return res.redirect('/');
    }
   res.status(401).send('Invalid username or password'); 
  }); 
});
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error destroying session');
    }

    // Po zakończeniu sesji, przekierowanie na stronę logowania
    res.redirect('/login'); // Możesz zmienić to na dowolny inny URL, np. '/'
  });
});

//Create new user
router.post('/register', (req, res) => {
  console.log('/users/register');
  
  const { username, password, confirm_password } = req.body;

  if (password !== confirm_password) {
      console.log('Passwords do not match');
      return res.status(400).send('Passwords do not match');
  }

  db.get('SELECT * FROM Users WHERE name = ?', [username], (err, user) => {
      if (err) {
          console.error('Error checking user:', err);
          return res.status(500).send('Error checking user');
      }

      if (user) {
          console.log(`User ${username} already exists`);
          return res.redirect('/');
      }

      db.run('INSERT INTO Users (name, password) VALUES (?, ?)', [username, password], function (err) {
          if (err) {
              console.error('Error inserting user:', err.message);
              return res.status(500).send('Error inserting user');
          }

          console.log(`User created with ID: ${this.lastID}`);
          res.redirect('/');
      });
  });
});


/* GET users. */
router.get('/',(req,res) => {
  db.all('SELECT * FROM Users', (err, rows) => {
    if (err) {
    console.error('Error getting users:', err.message);
    return res.status(500).send('Error getting users');
    }
    res.json(rows);
    });
});

//Delete user.
router.post('/delete',(req, res)=>{
  const {userId} = req.body;
  if(!userId){
    return res.status(400).send('User id is required.');
  }
  db.run('DELETE FROM Users WHERE id = ?', userId, function(err) {
    if (err) {
    console.error('Error deleting user:', err.message);
    return res.status(500).send('Error deleting user');
    }
    console.log(`User with ID ${userId} deleted`);
    res.send('User deleted successfully');
    });
});




module.exports = router;
