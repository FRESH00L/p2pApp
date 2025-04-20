var express = require('express');
var router = express.Router();
const db = require('../database/database');
const { render } = require('pug');

// Top-up balance
router.post('/top-up', (req, res) => {
    if (req.session.user) {
        const { amount, cardNumber } = req.body;
        const userId = req.session.user.id;
        const numericAmount = parseFloat(amount);

        db.get('SELECT credit FROM Cards WHERE cardNumber = ? AND cardHolder = ?', [cardNumber, userId], (err, card) => {
            if (err) {
                return res.status(500).send('Database error');
            }
            if (!card) {
                return res.status(403).send('Card not found');
            }
            if (card.credit < numericAmount) {
                return res.status(400).send('Not enough credit on this card');
            }

            // Kontynuuj tylko, jeśli wszystkie warunki zostały spełnione
            db.serialize(() => {
                db.run('UPDATE Cards SET credit = credit - ? WHERE cardNumber = ? AND cardHolder = ?', [numericAmount, cardNumber, userId]);
                db.run('UPDATE Users SET balance = balance + ? WHERE id = ?', [numericAmount, userId], function (err) {
                    if (err) {
                        console.error('Error topping up balance:', err.message);
                        return res.status(500).send('Error topping up balance');
                    }
                    req.session.user.balance += numericAmount;
                    return res.redirect('/');
                });
            });
        });
    } else {
        res.send("You have to be logged in to top up");
    }
});
  
  router.post('/addCard', (req,res) => {
    if(req.session.user){
    const {cardName,cardNumber, cvv, credit} = req.body;
    if (!validateCard(cardNumber, cvv)) {
      return res.status(400).send('Invalid card details');
    }
    if(credit<=0){
        return res.status(400).send('Credit must be greater than 0');
    }
    db.get('SELECT * FROM Cards WHERE cardNumber = ? OR cvv = ?', [cardNumber, cvv], (err, card) => {
      if (err) {
          console.error('Error checking card:', err);
          return res.status(500).send('Error checking card');
      }
  
      if (card) {
          console.log(`Card ${cardNumber} already exists`);
          return res.status(400).send('Card already exists');
      }
      const cardHolder = req.session.user.id;
      const experationDate = new Date();
        experationDate.setFullYear(experationDate.getFullYear() + 4);
        const formatted = experationDate.toISOString().slice(0, 10);
      db.run('INSERT INTO Cards (name, cardNumber, cardHolder,  cvv, experationDate, credit) VALUES (?, ?, ?, ?, ?, ?)', [cardName, cardNumber,cardHolder,cvv,formatted,credit], function (err) {
          if (err) {
              console.error('Error inserting card:', err.message);
              return res.status(500).send('Error inserting card');
          }
  
          console.log(`Card created with number: ${this.cardNumber}`);
          res.redirect('/'); // Przekierowanie do logowania po rejestracji
      });
  });
    }else{
      return res.send("You have to be logged in to add a card");
    }
  
  });
    function validateCard(cardNumber, cvv) {
      const cardNumberPattern = /^[0-9]{16}$/; 
      const cvvPattern = /^[0-9]{4}$/;
    
      return cardNumberPattern.test(cardNumber) && cvvPattern.test(cvv);
    }  
    module.exports = router;