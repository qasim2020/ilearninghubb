const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');

const hbsHelpers = require('./modules/helpers');

const app = express();
const PORT = process.env.PORT;

const MONGO_URI = process.env.MONGO_URI;
mongoose
    .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.engine('handlebars', exphbs.engine({ helpers: hbsHelpers }));
app.set('view engine', 'handlebars');
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'kidscamp')));

const regularRoutes = require('./routes/regularRoutes');

app.use(regularRoutes);

app.get('*', (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
