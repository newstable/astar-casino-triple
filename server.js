var express = require('express');
var app = express();
const axios = require("axios");
require('dotenv').config();
var bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
var cors = require('cors');
const util = require('util');
var server = require('http').createServer(app);
var port = 5008;
var io = require('socket.io')(server);
axios.defaults.headers.common["Authorization"] = process.env.SECRETCODE;

gameSocket = null;
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(__dirname + "/build"));
app.get("/*", function (req, res) {
  res.sendFile(__dirname + "/build/index.html", function (err) {
    if (err) {
      res.status(500).send(err);
    }
  });
});

server.listen(port, function () {
  console.log("server is running on " + port);
});
// Implement socket functionality
gameSocket = io.on('connection', function (socket) {
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('bet info', async (req) => {
    var cardPosition = [];
    var rateArray = [];
    var rate;
    var betResult = [];
    var amount = req.amount;
    var panelIndex;
    console.log(req)

    try {
      if (req.token != "demo") {
        try {
          await axios.post(process.env.PLATFORM_SERVER + "api/games/bet", {
            token: req.token,
            amount: req.betAmount
          });
        } catch {
          throw new Error("Bet Error")
        }
      }

      cardPosition = getCardPosition();
      for (var i = 0; i < req.selectedCardArray.length; i++) {
        rateArray.push(cardPosition[req.selectedCardArray[i]])
      }
      rateArray = rateArray.sort();
      rate = getScore(req.riskFlag, rateArray);
      panelIndex = getPanelIndex(req.riskFlag, rateArray);
      console.log(rateArray, panelIndex)
      earnAmount = req.betAmount * rate;
      amount -= req.betAmount;
      amount += req.betAmount * rate;
      if (req.token != "demo") {
        try {
          await axios.post(process.env.PLATFORM_SERVER + "api/games/winlose", {
            token: req.token,
            amount: req.betAmount * rate,
            winState: true
          });
        } catch {
          throw new Error("Can't find server!")
        }
      }

      betResult = { "earnAmount": req.betAmount * rate, "cardPosition": cardPosition, "amount": amount, "panelIndex": panelIndex, "selectedCardArray": req.selectedCardArray }
      socket.emit("bet result", betResult)

    } catch (err) {
      socket.emit("error message", { "errMessage": err.message })
    }
  });

  console.log('socket connected: ' + socket.id);
  socket.emit('connected', {});
});


function getCardPosition() {
  var stack = [];
  var bump = [];
  for (var i = 0; i < 9;) {
    var random = getRandomInt(36);
    if (bump.indexOf(random) == -1) {
      bump.push(random);
      i++;
    }
  }

  for (var i = 0; i < 36; i++) {
    if (bump[0] == i) {
      stack.push(2);
    }
    else if (bump[1] == i) {
      stack.push(2);
    }
    else if (bump[2] == i) {
      stack.push(2);
    }
    else if (bump[3] == i) {
      stack.push(1);
    }
    else if (bump[4] == i) {
      stack.push(1);
    }
    else if (bump[5] == i) {
      stack.push(1);
    }
    else if (bump[6] == i) {
      stack.push(1);
    }
    else if (bump[7] == i) {
      stack.push(1);
    }
    else if (bump[8] == i) {
      stack.push(1);
    }
    else {
      stack.push(0);
    }
  }
  return stack;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function arrayEquals(a, b) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}

const getScore = (riskFlag, rateArray) => {
  if (riskFlag == 0) {
    for (var score of lowBenefit) {
      if (arrayEquals(rateArray, score.counts)) {
        return score.rate;
      }
    }
  }
  else if (riskFlag == 1) {
    for (var score of mediumBenefit) {
      if (arrayEquals(rateArray, score.counts)) {
        return score.rate;
      }
    }
  }
  else if (riskFlag == 2) {
    for (var score of highBenefit) {
      if (arrayEquals(rateArray, score.counts)) {
        return score.rate;
      }
    }
  }
  return 0;
}

const getPanelIndex = (riskFlag, rateArray) => {
  if (riskFlag == 0) {
    for (var score of lowBenefit) {
      if (arrayEquals(rateArray, score.counts)) {
        return score.panelIndex;
      }
    }
  }
  else if (riskFlag == 1) {
    for (var score of mediumBenefit) {
      if (arrayEquals(rateArray, score.counts)) {
        return score.panelIndex;
      }
    }
  }
  else if (riskFlag == 2) {
    for (var score of highBenefit) {
      if (arrayEquals(rateArray, score.counts)) {
        return score.panelIndex;
      }
    }
  }
  return 0;
}

var lowBenefit = [
  {
    counts: [0, 0, 0],
    rate: 0.5,
    panelIndex: 0
  },
  {
    counts: [0, 0, 1],
    rate: 0.8,
    panelIndex: 1
  },
  {
    counts: [0, 0, 2],
    rate: 1.2,
    panelIndex: 2
  },
  {
    counts: [0, 1, 2],
    rate: 1.5,
    panelIndex: 3
  },
  {
    counts: [0, 1, 1],
    rate: 2.1,
    panelIndex: 4
  },
  {
    counts: [0, 2, 2],
    rate: 3.5,
    panelIndex: 5
  },
  {
    counts: [1, 1, 2],
    rate: 4.5,
    panelIndex: 6
  },
  {
    counts: [1, 1, 1],
    rate: 7.0,
    panelIndex: 7
  },
  {
    counts: [0, 2, 2],
    rate: 15.0,
    panelIndex: 8
  }
  ,
  {
    counts: [2, 2, 2],
    rate: 40.0,
    panelIndex: 9
  }
]

var mediumBenefit = [
  {
    counts: [0, 0, 0],
    rate: 0.0,
    panelIndex: 0
  },
  {
    counts: [0, 0, 1],
    rate: 0.5,
    panelIndex: 1
  },
  {
    counts: [0, 0, 2],
    rate: 1.5,
    panelIndex: 2
  },
  {
    counts: [0, 1, 2],
    rate: 2.4,
    panelIndex: 3
  },
  {
    counts: [0, 1, 1],
    rate: 3.0,
    panelIndex: 4
  },
  {
    counts: [0, 2, 2],
    rate: 6.7,
    panelIndex: 5
  },
  {
    counts: [1, 1, 2],
    rate: 10.0,
    panelIndex: 6
  },
  {
    counts: [1, 1, 1],
    rate: 15.0,
    panelIndex: 7
  },
  {
    counts: [0, 2, 2],
    rate: 30.0,
    panelIndex: 8
  }
  ,
  {
    counts: [2, 2, 2],
    rate: 80.0,
    panelIndex: 9
  }
]

var highBenefit = [
  {
    counts: [0, 0, 0],
    rate: 0.0,
    panelIndex: 0
  },
  {
    counts: [0, 0, 1],
    rate: 0.0,
    panelIndex: 1
  },
  {
    counts: [0, 0, 2],
    rate: 0.5,
    panelIndex: 2
  },
  {
    counts: [0, 1, 2],
    rate: 3.0,
    panelIndex: 3
  },
  {
    counts: [0, 1, 1],
    rate: 4.2,
    panelIndex: 4
  },
  {
    counts: [0, 2, 2],
    rate: 9.0,
    panelIndex: 5
  },
  {
    counts: [1, 1, 2],
    rate: 15.0,
    panelIndex: 6
  },
  {
    counts: [1, 1, 1],
    rate: 30.0,
    panelIndex: 7
  },
  {
    counts: [0, 2, 2],
    rate: 60.0,
    panelIndex: 8
  }
  ,
  {
    counts: [2, 2, 2],
    rate: 200.0,
    panelIndex: 9
  }
]