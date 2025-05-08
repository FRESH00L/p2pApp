const express = require('express');
const router = express.Router();
const db = require('../database/database');


router.get('/users', async (req, res) => {
    const userId = req.query.q;
    console.log('Searching for user:', userId);

    try {
        const userSql = `
            SELECT Users.id, Users.name, Users.balance
            FROM Users
            WHERE Users.id = ? OR Users.name = ? 
            LIMIT 1
        `;
        const users = await db.allAsync(userSql, [userId, `${userId}`]);

        if (users.length === 0) {
            return res.status(404).send('No users found');
        }

        const user = users[0];

        const cardsSql = `
            SELECT cardNumber, name, experationDate, credit
            FROM Cards
            WHERE cardHolder = ?
        `;
        const cards = await db.allAsync(cardsSql, [user.id]);

        const transactionsSql = `
            SELECT Transactions.amount, Transactions.text, 
                   sender.name AS sender_name, 
                   receiver.name AS receiver_name
            FROM Transactions
            JOIN Users AS sender ON Transactions.sender_id = sender.id
            JOIN Users AS receiver ON Transactions.receiver_id = receiver.id
            WHERE sender.id = ? OR receiver.id = ?
            ORDER BY Transactions.id DESC
        `;
        const transactions = await db.allAsync(transactionsSql, [user.id, user.id]);

        const friendsSql = `
            SELECT Friends.friend_id, Users.name AS friend_name
            FROM Friends
            JOIN Users ON Friends.friend_id = Users.id
            WHERE Friends.user_id = ?
        `;
        const friends = await db.allAsync(friendsSql, [user.id]);

        const response = {
            user: {
                id: user.id,
                name: user.name,
                balance: user.balance,
                role: user.role,
            },
            cards,
            transactions,
            friends,
        };
        console.log('User data:', response);
        res.render('admin', {user: response.user, cards: response.cards, transactions: response.transactions, friends: response.friends});
    } catch (err) {
        console.error('Error fetching user data:', err);
        res.status(500).send('Internal server error');
    }
});

module.exports = router;