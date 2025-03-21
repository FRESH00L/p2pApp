var express = require('express');
var router = express.Router();
const db = require('../database/database');

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
//User logout
router.post('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
  if (err) {
  console.error('Error destroying session:', err);
  return res.status(500).send('Error destroying session');
  }
  });
 });

//Topup
router.post('/top-up', (req, res) => {
  console.log(req.session.user);
    if(req.session.user){
    const { amount, cardNumber, cardHolder, cvv } = req.body;
    const userId = req.session.user.id;
    
    // Validate card details (add your own validation logic)
    if (!validateCard(cardNumber, cvv)) {
      return res.status(400).send('Invalid card details');
    }
  
    // Update the user's balance
    db.run('UPDATE Users SET balance = balance + ? WHERE id = ?', [amount, userId], function(err) {
      if (err) {
        console.error('Error topping up balance:', err.message);
        return res.status(500).send('Error topping up balance');
      }
  
      console.log(`User with ID ${userId} topped up with ${amount}`);
      res.redirect('/'); // Redirect to the user dashboard after successful top-up
    });
  }
  else{
  res.send("You have to be logged in to top up");
  }
  });

  
  // Simple card validation function (modify as needed)
  function validateCard(cardNumber, cvv) {
    const cardNumberPattern = /^[0-9]{9}$/;  // Example: 16-digit card number
    const cvvPattern = /^[0-9]{4}$/;         // Example: 3-digit CVV
  
    return cardNumberPattern.test(cardNumber) && cvvPattern.test(cvv);
  }  


//Create new user
router.post('/', (req,res)=>{
    const {name, password, balance, cardNumber, cardHolder, cvv} = req.body;
    db.run('INSERT INTO Users (name, password, balance, cardNumber, cardHolder, cvv) VALUES (?, ?,?,?,?,?)',
       [name, password, balance, cardNumber, cardHolder, cvv],
      function(err) {
      if (err) {
      console.error('Error inserting user:', err.message);
      return res.status(500).send('Error inserting user');
      }
      console.log(`User created with ID: ${this.lastID}`);
      res.send('User created successfully');
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

//Top-up balance
router.post('/top-up', (req, res) => {
  if(req.session.user) {
    const { amount, cardNumber, cardHolder, cvv } = req.body;
    const userId = req.session.user.id;
    const userBalance = req.session.user.balance;

    // Validate card details
    if (!validateCard(cardNumber, cvv)) {
      return res.status(400).send('Invalid card details');
    }

    // Update the user's balance in the database
    db.run('UPDATE Users SET balance = balance + ? WHERE id = ?', [amount, userId], function(err) {
      if (err) {
        console.error('Error topping up balance:', err.message);
        return res.status(500).send('Error topping up balance');
      }

      console.log(`User with ID ${userId} topped up with ${amount}`);

      // Update session with new balance
      userBalance += amount;

      // Redirect to the user dashboard
      return res.redirect('/'); 
    });
  } else {
    res.send("You have to be logged in to top up");
  }
});


// Example simple card validation (you can expand this later)
function validateCard(cardNumber, cvv) {
  const cardNumberPattern = /^[0-9]{9}$/;  
  const cvvPattern = /^[0-9]{4}$/;      

  return cardNumberPattern.test(cardNumber) && cvvPattern.test(cvv);
}

module.exports = router;
