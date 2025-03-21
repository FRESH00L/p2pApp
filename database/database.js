const sqlite3 = require('sqlite3').verbose();

// SQLite database connection
const db = new sqlite3.Database('./database.db', (err) => {
 if (err) {
 console.error('Error in the connection with the database:',
err.message);
 } else {
 console.log('Successful connection to the SQLite database.');
 createTables();
 }
});

function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        balance FLOAT DEFAULT 0.0 CHECK (balance >= 0.0)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Cards (
        cardNumber TEXT NOT NULL CHECK (LENGTH(cardNumber) = 9) PRIMARY KEY, 
        name TEXT NULL,
        cardHolder INTEGER NOT NULL,
        cvv TEXT NOT NULL CHECK (LENGTH(cvv) BETWEEN 3 AND 4) UNIQUE,
        FOREIGN KEY (cardHolder) REFERENCES Users(id)
)`);

    db.run(`CREATE TABLE IF NOT EXISTS Transactions (
        id INTEGER PRIMARY KEY,
        amount FLOAT NOT NULL CHECK (amount > 0),
        text TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES Users(id),
        FOREIGN KEY (receiver_id) REFERENCES Users(id)
    )`);
}

   module.exports = db;