const express = require('express');
const router = express.Router();
const db = require('../database/database');

// Helpers
function validateCard(cardNumber, cvv) {
    const cardNumberPattern = /^[0-9]{16}$/;
    const cvvPattern = /^[0-9]{4}$/;
    return cardNumberPattern.test(cardNumber) && cvvPattern.test(cvv);
}

function ensureLoggedIn(req, res) {
    if (!req.session.user) {
        res.status(401).send("You have to be logged in");
        return false;
    }
    return true;
}

// Dodawanie karty
router.post('/addCard', (req, res) => {
    if (!ensureLoggedIn(req, res)) return;

    const { cardName, cardNumber, cvv, credit } = req.body;
    const userId = req.session.user.id;

    if (!validateCard(cardNumber, cvv)) {
        return res.status(400).send('Invalid card details');
    }

    if (credit <= 0) {
        return res.status(400).send('Credit must be greater than 0');
    }

    db.get('SELECT * FROM Cards WHERE cardNumber = ? OR cvv = ?', [cardNumber, cvv], (err, existingCard) => {
        if (err) {
            console.error('Error checking card:', err.message);
            return res.status(500).send('Error checking card');
        }

        if (existingCard) {
            console.warn(`Card ${cardNumber} already exists`);
            return res.status(400).send('Card already exists');
        }

        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 4);
        const formattedDate = expirationDate.toISOString().slice(0, 10);

        db.run(
            'INSERT INTO Cards (name, cardNumber, cardHolder, cvv, experationDate, credit) VALUES (?, ?, ?, ?, ?, ?)',
            [cardName, cardNumber, userId, cvv, formattedDate, credit],
            function (err) {
                if (err) {
                    console.error('Error inserting card:', err.message);
                    return res.status(500).send('Error inserting card');
                }

                console.log(`Card created: ${cardNumber}`);
                res.redirect('/');
            }
        );
    });
});

// Doładowanie konta z karty
router.post('/top-up', (req, res) => {
    if (!ensureLoggedIn(req, res)) return;

    const { amount, cardNumber } = req.body;
    const userId = req.session.user.id;
    const numericAmount = parseFloat(amount);

    db.get(
        'SELECT credit FROM Cards WHERE cardNumber = ? AND cardHolder = ?',
        [cardNumber, userId],
        (err, card) => {
            if (err) {
                console.error('Database error:', err.message);
                return res.status(500).send('Database error');
            }

            if (!card) {
                return res.status(403).send('Card not found');
            }

            if (card.credit < numericAmount) {
                return res.status(400).send('Not enough credit on this card');
            }

            db.serialize(() => {
                db.run(
                    'UPDATE Cards SET credit = credit - ? WHERE cardNumber = ? AND cardHolder = ?',
                    [numericAmount, cardNumber, userId]
                );
                db.run(
                    'UPDATE Users SET balance = balance + ? WHERE id = ?',
                    [numericAmount, userId],
                    function (err) {
                        if (err) {
                            console.error('Error topping up balance:', err.message);
                            return res.status(500).send('Error topping up balance');
                        }

                        req.session.user.balance += numericAmount;
                        return res.redirect('/');
                    }
                );
            });
        }
    );
});

module.exports = router;
