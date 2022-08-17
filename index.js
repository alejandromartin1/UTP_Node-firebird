const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

require('dotenv').config();

const app = express();

// Configuracion de plantillas Handlebars
app.set('views', path.join(__dirname, 'src', 'views'));     // Definiendo las rutas de las vistas
app.engine('.hbs', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),     // Definiendo la vista principal
    partialsDir: path.join(app.get('views'), 'layouts'),    // Definiendo las extenciones para la vista principal
    extname: '.hbs',                                        // Definiendo la extencion para las vistas
}));
app.set('view engine', '.hbs');

// Definiendo la ruta para acceder en los archivos desde las etiquetas html
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares
app.use(express.json());                            // Admite en el request datos tipo json
app.use(express.urlencoded({ extended: false }));  // Lee los resultados de los formularios en el request

// Configurando las sesiones
app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
}));
app.use(flash());


// Variables Globales
app.use((req, res, next) => {
    res.locals.error_msj = req.flash('error_msj');
    res.locals.isAuthenticated = req.session.isAuthenticated;
    res.locals.IDAuth = req.session.IDAuth;
    res.locals.nameAuth = req.session.nameAuth;
    res.locals.lastNameAuth = req.session.lastNameAuth
    res.locals.isAdmin = req.session.isAdmin;
    next();
})

// Aqui se definen las rutas
app.use(require('./src/routes/routes'));


// Aqui se levanta el servidor y se define el puerto
app.listen(process.env.PORT || 3080, () => console.log('Servidor corriendo en http://localhost:' + process.env.PORT));