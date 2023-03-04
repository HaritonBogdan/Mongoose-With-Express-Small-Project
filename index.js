const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const AppError = require("./AppError");

const Product = require('./models/product');
const Farm = require('./models/farm');
const ObjectID = require('mongoose').Types.ObjectId;
const session = require('express-session');
const flash = require('connect-flash');

const sessionOptions = { secret: 'thisisnotagoodsecret', resave: false, saveUninitialized: false };

main().catch(err => console.log(err));
async function main() {
    mongoose.set('strictQuery', true);
    await mongoose.connect('mongodb://127.0.0.1:27017/farmStand');
    console.log('connected to db farmStand')
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session(sessionOptions));
app.use(flash());

app.use((req, res, next) => {
    res.locals.messages = req.flash('success');
    next();
})

const categories = ['fruit', 'vegetable', 'dairy'];

function wrapAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(e => next(e));
    }
}

// FARM ROUTES

app.get('/farms', wrapAsync(async (req, res, next) => {
    const farms = await Farm.find({});
    res.render('farms/index', { farms })
}))

app.get('/farms/new', (req, res) => {
    res.render('farms/new')
})


app.post('/farms', wrapAsync(async (req, res, next) => {
    const farm = new Farm(req.body);
    await farm.save()
    req.flash('success', 'Successfully made a new farm!');
    res.redirect('/farms')
}))

app.get('/farms/:id', wrapAsync(async (req, res, next) => {
    const farm = await Farm.findById(req.params.id).populate('products');
    // console.log(farm);
    res.render('farms/show', { farm })
}))

app.delete('/farms/:id', wrapAsync(async (req, res, next) => {
    // console.log('delete');
    const farm = await Farm.findByIdAndDelete(req.params.id);
    res.redirect('/farms');
}))

app.get('/farms/:id/products/new', wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const farm = await Farm.findById(id);
    res.render('products/new', { categories, farm })
}))

app.post('/farms/:id/products', wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const farm = await Farm.findById(id);
    const { name, price, category } = req.body;
    const product = new Product({ name, price, category });
    farm.products.push(product);
    product.farm = farm;
    await farm.save();
    await product.save();
    res.redirect(`/farms/${id}`)
}))







// PRODUCT ROUTES


app.get('/products', wrapAsync(async (req, res, next) => {
    const { category } = req.query;
    if (category) {
        const products = await Product.find({ category })
        res.render('products/index', { products, category })
    } else {
        const products = await Product.find({})
        res.render('products/index', { products, category: 'All' })
    }
}))

app.get('/products/new', (req, res) => {
    res.render('products/new', { categories })
})

app.post('/products', wrapAsync(async (req, res, next) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.redirect(`/products/${newProduct._id}`);
}))


app.get('/products/:id', wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectID.isValid(id)) {
        throw new AppError('Invalid Id', 400);
    }
    const product = await Product.findById(id).populate('farm', 'name');
    console.log(product);
    if (!product) {
        throw new AppError('Product Not Found', 404);
    }
    res.render('products/show', { product })
}))

app.get('/products/:id/edit', wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    if (!ObjectID.isValid(id)) {
        throw new AppError('Invalid Id', 400);
    }
    const product = await Product.findById(id);
    if (!product) {
        throw new AppError('Product Not Found', 404);
    }
    res.render("products/edit", { product, categories });
}))

app.put('/products/:id', wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body, { runValidators: true });
    res.redirect(`/products/${product._id}`)
}))

app.delete('/products/:id', wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const deleteProduct = await Product.findByIdAndDelete(id);
    res.redirect('/products');
}))

const handleValidationErr = err => {
    return new AppError(`Validation Failed...${err.message}`, 400);
}

app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') err = handleValidationErr(err)
    next(err);
})

app.use((err, req, res, next) => {
    const { status = 500, message = "Something Went Wrong!" } = err;
    res.status(status).send(message);
})

app.listen(3000, () => {
    console.log("hei");
})