var express = require('express');
var router = express.Router();
const db = require('../database/database');

// Create transaction
router.post('/new', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("You have to be logged in to send money");
    }
    const password = req.body.password;
    db.get('SELECT * FROM Users WHERE password = ?', [password], (err, reciver) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).send('Error password not valid');
        } if (!reciver) {
            return res.status(404).send('Password not valid');
        }
    });

    const { amount, text, reciver_number } = req.body;
    const sender_id = req.session.user.id;

    if (amount <= 0) {
        return res.status(400).send("Invalid amount");
    }

    // Pobierz dane odbiorcy
    db.get('SELECT * FROM Users WHERE cardNumber = ?', [reciver_number], (err, reciver) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).send('Error checking recipient');
        }
        if (!reciver) {
            return res.status(404).send('Recipient not found');
        }

        const receiver_id = reciver.id;

        // Pobierz saldo nadawcy
        db.get('SELECT balance FROM Users WHERE id = ?', [sender_id], (err, sender) => {
            if (err) {
                console.error('Error checking sender balance:', err);
                return res.status(500).send('Error checking sender balance');
            }
            if (!sender || sender.balance < amount) {
                return res.status(400).send('Insufficient balance');
            }

            // Rozpoczęcie transakcji SQLite
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Odejmij pieniądze od nadawcy
                db.run('UPDATE Users SET balance = balance - ? WHERE id = ?', [amount, sender_id], function (err) {
                    if (err) {
                        console.error('Error updating sender balance:', err);
                        db.run('ROLLBACK'); // Cofnij transakcję
                        return res.status(500).send('Error updating sender balance');
                    }

                    // Dodaj pieniądze do odbiorcy
                    db.run('UPDATE Users SET balance = balance + ? WHERE id = ?', [amount, receiver_id], function (err) {
                        if (err) {
                            console.error('Error updating receiver balance:', err);
                            db.run('ROLLBACK'); // Cofnij transakcję
                            return res.status(500).send('Error updating receiver balance');
                        }

                        // Zapisz transakcję
                        db.run('INSERT INTO Transactions (amount, text, sender_id, receiver_id) VALUES (?,?,?,?)',
                            [amount, text, sender_id, receiver_id], function (err) {
                                if (err) {
                                    console.error('Error while creating transaction:', err);
                                    db.run('ROLLBACK'); // Cofnij transakcję
                                    return res.status(500).send('Error while creating transaction');
                                }

                                db.run('COMMIT'); // Zatwierdź transakcję
                                console.log(`Transaction complete: ${sender_id} sent ${amount} to ${receiver_id}`);
                                
                                // Aktualizacja sesji użytkownika
                                req.session.user.balance -= amount;

                                res.redirect('/');
                            });
                    });
                });
            });
        });
    });
});

module.exports = router;