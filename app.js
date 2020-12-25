const firebase = require("firebase");
const express = require("express");
const bodyParser = require("body-parser");
const isAuth = require('./Middleware/is-auth');
const jwt = require('jsonwebtoken');
const app = express();

// * initialization for firebase (apikey, authdomain, etc..)

const fireapp = firebase.initializeApp({
    // * intialize firebase config here
});

const auth = fireapp.auth();
const db = fireapp.firestore();

// * allowing certain request

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json', 'Authorization');
    next();
});

// * for parsing json requests
app.use(bodyParser.json());

// * add post of - /signin

app.post("/signin", function(req, res) {
    const email = req.body.email;
    const password = req.body.password;

    auth.signInWithEmailAndPassword(email, password).then(cred => {
        console.log("cred.user.emailVerified", cred.user.emailVerified);
        if (cred.user.emailVerified === true) {
            const userEmail = cred.user.email;
            const userid = cred.user.uid;
            const token = jwt.sign({
                email: userEmail,
                uid: userid
            }, "<jwt encryption key>");
            res.status(200).json({
                "verify": "verified",
                "token": token
            });
        } else {
            res.status(401).json({
                'verify': 'invalid user / user not verified'
            });
        }
    }).catch(error => {
        res.status(401).json({
            'verify': error.message
        });
    })
})

// * add post of - /signup

app.post("/signup", function(req, res) {
    const email = req.body.email;
    const password = req.body.password;
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        if (cred) {
            const userEmail = cred.user.email;
            const userid = cred.user.uid;
            cred.user.sendEmailVerification().then(() => {
                res.status(200).json({
                    "verify": "sent email verification"
                });
            }).catch(error => {
                res.status(401).json({
                    'verify': error.message
                });
            })
        }
    }).catch(error => {
        res.status(401).json({
            'verify': error.message
        });
    });
})

// * add verification url - /verify

app.get("/verify", isAuth, function(req, res) {
    res.status(200).json({
        "verify": "verified"
    });
})

// * add logout of - /logout

app.get("/logout", isAuth, function(req, res) {
    auth.signOut().then(() => {
        res.status(200).json({
            "user": "logout"
        })
    }).catch(error => {
        res.status(400).json({
            "user": error.message
        })
    })
});

// * add password reset of - /passwordreset

app.post("/passwordreset", function(req, res) {
    const userEmail = req.body.email;
    auth.sendPasswordResetEmail(userEmail).then(() => {
        res.status(200).json({
            "email": "sent"
        })
    }).catch(error => {
        res.status(401).json({
            "email": error.message
        });
    })
})

// * add post of - /post

app.post("/post", isAuth, function(req, res) {
    const userid = req.uid;
    /* <Other POST request data from front-end> */
    const url = req.body.url;
    const title = req.body.title;
    const note = req.body.note;

    db.collection(userid).add({
        /* <Other POST request data from front-end> */
        url: url,
        title: title,
        note: note
    }).then(() => {
        res.status(200).json({
            status: "uploaded"
        });
    }).catch(err => {
        res.status(400).json({
            status: err.message
        });
    })
});

// * add get of - /get

app.get("/get", isAuth, function(req, res) {
    var posts = [];
    const userid = req.uid;
    if (userid) {
        db.collection(userid).get().then((snapshot) => {
            snapshot.docs.forEach(doc => {
                /* <Other GET request data to take from firebase> */
                let urlg = doc.data().url;
                let titleg = doc.data().title;
                let noteg = doc.data().note;
                posts.push({
                    /* <Other GET request data from firebase> */
                    'url': urlg,
                    'title': titleg,
                    'note': noteg,
                    'dataid': doc.id
                });
            })
            if (posts) {
                res.status(200).json({
                    post: posts
                });
            } else {
                res.status(200).json({
                    post: "null"
                });
            }
        }).catch(err => {
            res.status(400).json({
                error: err.message
            });
        });
    }

});

// * add post of - /update

app.post("/update", isAuth, function(req, res) {
    const userid = req.uid;
    const dataId = req.body.dataid;
    const updatenote = req.body.updatenote;
    db.collection(userid).doc(dataId).update({
        note: updatenote
    })
});

// * add post of - /delete

app.post("/delete", isAuth, function(req, res) {
    const userid = req.uid;
    const dataId = req.body.dataid;
    db.collection(userid).doc(dataId).delete();
});

// * for listening to certain request at specific port
app.listen(3000, function() {
    console.log("Server has been started");
});