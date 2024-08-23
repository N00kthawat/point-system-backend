const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());

const secretKey = 'nook';


const usersFilePath = path.join(__dirname, 'users.json');
const productsFilePath = path.join(__dirname, 'products.json');

const readFromFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2)); // Create file if it doesn't exist
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
};


const writeToFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};


const users = readFromFile(usersFilePath);

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        const token = jwt.sign({ id_user: user.id_user, username: user.username }, secretKey, { expiresIn: '1h' });
        res.setHeader('X-User-ID', user.id_user); // Ensure this header is set
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.get('/users/:userId', (req, res) => {
    let users = readFromFile(usersFilePath);
    const user = users.find(u => u.id_user === Number(req.params.userId));
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
});

app.get('/products', (req, res) => {
    const products = readFromFile(productsFilePath);
    res.json(products);
});

app.get('/product/:id', (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const products = readFromFile(productsFilePath);
    const product = products.find(p => p.id === productId);

    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

app.post('/redeem', (req, res) => {
    const { id_user, product_id } = req.body;
    console.log('Redeem route accessed', req.body);

    let users = readFromFile(usersFilePath);
    const user = users.find(u => u.id_user === id_user);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const products = readFromFile(productsFilePath);
    const product = products.find(p => p.id === product_id);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (!user.redeemedProducts) {
        user.redeemedProducts = [];
    }
    if (user.redeemedProducts.includes(product_id)) {
        return res.status(400).json({ message: 'Product already redeemed by the user' });
    }

    if (user.userpoint < product.points) {
        return res.status(400).json({ message: 'Insufficient points' });
    }

    user.userpoint -= product.points;
    user.redeemedProducts.push(product_id);

    // Update users file
    writeToFile(usersFilePath, users);

    res.json({ message: 'Product redeemed successfully', remainingPoints: user.userpoint });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
