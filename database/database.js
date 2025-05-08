const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

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

db.getAsync = promisify(db.get).bind(db);
db.runAsync = promisify(db.run).bind(db);
db.allAsync = promisify(db.all).bind(db);

function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        balance REAL DEFAULT 0.0 CHECK (balance >= 0.0),
        role TEXT DEFAULT 'user'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Cards (
        cardNumber TEXT NOT NULL CHECK (LENGTH(cardNumber) = 16) PRIMARY KEY, 
        name TEXT NULL,
        cardHolder INTEGER NOT NULL,
        cvv TEXT NOT NULL CHECK (LENGTH(cvv) = 4) UNIQUE,
        experationDate TEXT NOT NULL,
        credit REAL NOT NULL CHECK (credit > 0),
        FOREIGN KEY (cardHolder) REFERENCES Users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Transactions (
        id INTEGER PRIMARY KEY,
        amount REAL NOT NULL CHECK (amount > 0),
        text TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        FOREIGN KEY (sender_id) REFERENCES Users(id),
        FOREIGN KEY (receiver_id) REFERENCES Users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Friends (
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        PRIMARY KEY (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (friend_id) REFERENCES Users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS FriendRequests (
        sender INTEGER NOT NULL,
        reciver INTEGER NOT NULL,
        PRIMARY KEY (sender, reciver),
        FOREIGN KEY (sender) REFERENCES Users(id),
        FOREIGN KEY (reciver) REFERENCES Users(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS TransferRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requesting INTEGER NOT NULL,
        requested INTEGER NOT NULL,
        amount FLOAT NOT NULL CHECK (amount > 0),
        text TEXT NOT NULL,
        FOREIGN KEY (requesting) REFERENCES Users(id),
        FOREIGN KEY (requested) REFERENCES Users(id)
    )`);
    // zmienic transferRequest zeby mialo txt i ogarnac txt w requestach
    // dodac id do transferRequest zeby mozna bylo wysylac wiecej requestow
}

   module.exports = db;