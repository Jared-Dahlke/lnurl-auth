const express = require('express');
const LnurlAuth = require("passport-lnurl-auth");
const passport = require('passport');
const session = require('express-session');
const cors = require("cors");
const path = require("path");

const app = express();

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);


const config = {
	port: 3001,
	host:'lnurl-auth-example.onrender.com',
	url: 'https://lnurl-auth-example.onrender.com:3001'
}


app.use(session({
	secret: '12345',
	resave: true,
	saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

const map = {
	user: new Map(),
};

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	done(null, map.user.get(id) || null);
});

passport.use(new LnurlAuth.Strategy(function(linkingPublicKey, done) {
	let user = map.user.get(linkingPublicKey);
	if (!user) {
		user = { id: linkingPublicKey };
		map.user.set(linkingPublicKey, user);
	}
	done(null, user);
}));

app.use(passport.authenticate('lnurl-auth'));

app.get('/', function(req, res) {
	if (!req.user) {
		return res.send('You are not authenticated. To login go <a href="/login">here</a>.');
		// return res.redirect('/login');
	}
	res.send('Logged-in');
});

app.get('/login',
	function(req, res, next) {
		if (req.user) {
			// Already authenticated.
			return res.redirect('http://localhost:3000/');
		}
		next();
	},
	new LnurlAuth.Middleware({
		callbackUrl: config.url + '/login',
		cancelUrl: "http://localhost:3000/",
        loginTemplateFilePath: path.join(__dirname, 'login.html'),
	})
);

app.get("/user", (req, res) => {
    res.send(req.user);
})

app.get('/logout',
	function(req, res, next) {
		if (req.user) {
            req.session.destroy();
            res.json({message: "user logged out"});
			// Already authenticated.
			return res.redirect('http://localhost:3000/');
		}
		next();
	});

const server = app.listen(config.port, function() {
	console.log('Server listening at ' + config.url);
});

process.on('uncaughtException', error => {
	console.error(error);
});

process.on('beforeExit', code => {
	try {
		server.close();
	} catch (error) {
		console.error(error);
	}
	process.exit(code);
});
