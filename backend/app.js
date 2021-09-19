const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const e = require("express");
const { toLower } = require("lodash");

const accountSchema = new mongoose.Schema({
    type: String, 
    organization: String,
    firstName: String, 
    lastName: String, 
    email: String,
    password: String,
    interactions: [{
        id: Number,
        date: String
    }]
});
const AccountData = new mongoose.model("AccountData", accountSchema);

const settingsSchema = new mongoose.Schema({
    organization: String, 
    email: [String],
    beacons: [String],
    infected: [{
        id: Number,
        date: String
    }]
});

const SettingsData = new mongoose.model("SettingsData", settingsSchema);

const tryToConnect = () => {
    mongoose.connect("mongodb://localhost:27017/tracingDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  }

tryToConnect();
const db = mongoose.connection;
db.on('error', () => {
  setTimeout(function () {
    console.log("Error connecting to the database. Retrying");
    tryToConnect();
  }, 10);
});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let currentUsers = new Map();
let notify = new Set();
app.post("/login", async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let type = req.body.type;
    let organ = req.body.organization;

    let results = await AccountData.find({
        type: type, 
        organization: organ,
        email: email,
        password: password
    });

    if (results.length != 1) {
        res.send("Invalid")
    } else {
        res.send(results[0].id)
    }
});

app.post("/signup", async (req, res) => {
    let first = req.body.firstName;
    let last = req.body.lastName;
    let email = req.body.email;
    let password = req.body.password;

    let type = req.body.type;
    let organ = req.body.organization;

    if (type == "admin") {
        const dbItem = new SettingsData({
            organization: organ
        });
        dbItem.save((err) => {
            if (err) {console.error(err)}
        else {console.log("Item saved successfully")}
        });
    } else {
        let results = await SettingsData.find({
            organization: organ
        });
        if (results.length == 1) {
            let emailArray = results[0].email != null ? results[0].email : [email];
            if (emailArray[0] != email) {
                emailArray.push(email);
            }
            SettingsData.update({organization: organ}, {$set:{email: emailArray}}, function(err, result) {
                if (err)
                    console.log("I aint doing anything lmao")
            });
        }
    }

    const dbItem = new AccountData({
        type: type, 
        organization: organ,
        firstName: first, 
        lastName: last, 
        email: email,
        password: password
    });
    dbItem.save((err) => {
        if (err) {console.error(err)}
    else {console.log("Item saved successfully")}
    });
    res.send("ok");
});
app.post("/addSettings", (req, res) => {
    let organ = req.body.organization;
    let secondTracing = req.body.secondTracing;
    const dbItem = new SettingsData({
        organization: organ, 
        secondTracing: toLower(secondTracing) == "true"
    });
    dbItem.save((err) => {
        if (err) {console.error(err)}
    else {console.log("Item saved successfully")}
    });
    res.send("ok");
});
app.post("/addBeacon", async (req, res) => {
    let id = req.body.id;
    let organ = req.body.organization;
    let results = await SettingsData.find({
        organization: organ
    });
    if (results.length == 1) {
        let beaconArray = results[0].beacons != null ? results[0].beacons : [id];
        if (beaconArray[0] != id) {
            beaconArray.push(id);
        }
        SettingsData.update({organization: organ}, {$set:{beacons: beaconArray}}, function(err, result) {
            if (err)
                console.log("I aint doing anything lmao")
        });
        res.send("ok");
    }
    else {
        res.send("organization not found")
    }


    res.send("ok")
})
app.get("/getBeacons", async (req, res) => {
    let organ = req.body.organization;

    let results = await SettingsData.find({
        organization: organ
    });
    if (results.length == 1) {
        res.send(JSON.stringify({ids: results[0].beacons}))
    }
    else {
        res.send("organization does not exist")
    }
});

app.post("/clockIn", async (req, res) => {
    let organ = req.body.organization;
    let email = req.body.email;
    let results = await AccountData.find({
        organization: organ,
        email: email
    });
    if (results.length == 1) {
        if (!currentUsers.has(organ)) {
            currentUsers.set(organ, new Map());
            currentUsers.get(organ).set(email, new Map());
        } else {
            let organMap = currentUsers.get(organ);
            if (!organMap.has(email)) {
                organMap.set(email, new Map());
            }
        }
        res.send("ok");
    }
    res.send("Invalid User")
});

function standardizeRatios(sA, sB, sC) {
    let dA = 1/Math.sqrt(sA + 100);
    let dB = 1/Math.sqrt(sB + 100);
    let dC = 1/Math.sqrt(sC + 100);

    return [parseInt(100*dB/dA), parseInt(100*dC/dA)];
}
function areNear(s1A, s2A, s1B, s2B, s1C, s2C) {
    let [d1B, d1C] = standardizeRatios(s1A, s1B, s1C);
    let [d2B, d2C] = standardizeRatios(s2A, s2B, s2C);

    return (d1B <= (d2B + 10) && d1B >= (d2B - 10) && d1C <= (d2C + 10) && d1C >= (d2C - 10))

}
app.post("/position", async (req, res) => {
    let beacon1 = req.body.beacon1
    let b1Value = req.body.beacon1Value
    let beacon2 = req.body.beacon2
    let b2Value = req.body.beacon2Value
    let beacon3 = req.body.beacon3
    let b3Value = req.body.beacon3Value
    let email = req.body.email;
    let organ = req.body.organization;
    let personMap;
    let count = 0;
    if (currentUsers.has(organ)) {
        personMap = currentUsers.get(organ).get(email);
        personMap.set(beacon1, b1Value);
        personMap.set(beacon2, b2Value);
        personMap.set(beacon3, b3Value);
        let currentKeys = Array.from(personMap.keys()).sort();
        let k1 = currentKeys[0];
        let k2 = currentKeys[1];
        let k3 = currentKeys[2];
        let currentPeople = Array.from(organMap.keys());
        currentPeople.forEach(personEmail => {
            let currentMap = organMap.get(personEmail);
            if (personEmail != email) {
                if (areNear(personMap.get(k1), currentMap.get(k1), personMap.get(k2), currentMap.get(k2), personMap.get(k3), currentMap.get(k3))) {
                    let result = AccountData.find({organization: organ, email, email})[0]

                    let interactionArray = result.interactions != null ? result.interactions : [personEmail];

                    if (interactionArray[0] != personEmail) {
                        interactionArray.push(personEmail);
                    }

                    AccountData.update({organization: organ, email: email}, {$set:{interactions: interactionArray}}, function(err, result) {
                        if (err)
                            console.log("I aint doing anything lmao")
                    });
                }
            }
        });
    }
    res.send(count);
});


function secondaryTracing(email, organ) {
    let results = AccountData.find({organization: organ});
    results.forEach(account => {
        if (account.interactions.includes(email)) {
            notify.add(email);
        }
    });
}

app.post("/report", async (req, res) => {
    let email = req.body.email;
    let organ = req.body.organization;
    let results = AccountData.find({organization: organ});
    results.forEach(account => {
        if (account.interactions.includes(email)) {
            notify.add(email);
            secondaryTracing(email, organ);
        }
    });
    res.send("ok");
});

app.post("/isInfected", async (req, res) => {
    let email = req.body.email;

    if (notify.has(email)) {
        res.send("ok");
    } else {
        res.send("no");
    }
});
app.listen(4000);
console.log("Started");
