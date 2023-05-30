const express = require('express');
var bodyParser = require('body-parser')
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const { v4: uuidv4 } = require('uuid');




// Serve the static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', __dirname + '/public');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())


const {google} = require('googleapis');

const serviceAccountKeyFile = "./utopian-sky-386209-09364afcd939.json";
const sheetId = '1G8e2yFInBiZUF3sS36y9lgEE3wVJ0SmAEh8oceVsirk'
const tabName = 'Sheet1'
const range = 'A:J'

const tabName2 = 'c_guidelines'
const range2 = 'A:C'

const tabName3 = 'c_history'
const range3 = 'A:B';
const range4 = 'A1:B50';

async function addChat(msg, name) {

  console.log('here');
  
  let inputValues = [msg, name].join('|~|');
  console.log(inputValues);
  const googleSheetClient = await _getGoogleSheetClient();
  
  await googleSheetClient.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    resource: { 
      requests: [
        {
         "insertRange": {
            "range": {//Sheet1!A3
              "sheetId": 2094104424,
              "startRowIndex": 0,
              "endRowIndex": 1,
              "startColumnIndex": 0,
              "endColumnIndex": 2,
             },
            "shiftDimension": "ROWS"
          }
        },
        {
            "pasteData": {
            "data": inputValues,
            "type": "PASTE_NORMAL",
            "delimiter": "|~|",
            "coordinate": {
             "sheetId": 2094104424,
             "rowIndex": 0,
            }
          }
        }
      ]
    }
  },(err,res)=>console.log(err ? err : res))

};


// Listen for incoming connections from clients
io.on('connection', (socket) => {
    console.log('A user has connected');

    console.log('here');
   

    // Listen for incoming chat messages from clients
    socket.on('chat message', (msg) => {
        console.log(`Message: ${msg.msg}`);
        io.emit('chat message', msg); // Broadcast the message to all connected clients
        addChat(msg.msg, msg.user);
    });

    // Listen for disconnections from clients
    socket.on('disconnect', () => {
        console.log('A user has disconnected');
    });
});

app.get('/', (req, res) => {
    res.render("index.html")
});

app.get('/fetchKeys', async (req, res) => {
    let data = await getSheets(tabName, range);
    res.json(data)
});

app.get('/fetchCriteria', async (req, res) => {
    let data = await getSheets(tabName2, range2);
    res.json(data)
});

app.get('/fetchHistory', async (req, res) => {
    let data = await getSheets(tabName3, range4);
    res.json(data)
});

app.post('/setData', async (req, res) => {
  console.log(req.body)

  const inputValues = req.body.keys; // This is a sample input value.
  const googleSheetClient = await _getGoogleSheetClient();

  const { data: { values }} = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!${range}` });
  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    resource: {values: values.map((r) => inputValues.includes(r[3]) ? [r[0], r[1], r[2], r[3], parseInt(r[4])+1, r[5], r[6],r[7],r[8]] : r)},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});

app.post('/setDef', async (req, res) => {

  const inputValues = req.body.keys; // This is a sample input value.
  const googleSheetClient = await _getGoogleSheetClient();

  const thing = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!G:G` });

  let json = JSON.parse(thing.data.values[inputValues][0]);

  json[req.body.user] = 0;


  const { data: { values }} = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!${range}` });
  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    resource: {values: values.map((r) => inputValues.includes(r[3]) ? [r[0], r[1], req.body.def, r[3], r[4], r[5], JSON.stringify(json),r[7],r[8]] : r)},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});

app.post('/upvoteDef', async (req, res) => {
  console.log(req.body)

  const inputValues = req.body.keys; // This is a sample input value.
  const googleSheetClient = await _getGoogleSheetClient();

  const thing = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!G:G` });

  let json = JSON.parse(thing.data.values[inputValues][0]);

  json[req.body.def] = json[req.body.def]+1;

  const { data: { values }} = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!${range}` });

  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    resource: {values: values.map((r) => inputValues.includes(r[3]) ? [r[0], r[1], r[2], r[3], r[4], r[5], JSON.stringify(json),r[7],r[8]] : r)},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});

app.post('/downvoteDef', async (req, res) => {
  console.log(req.body)

  const inputValues = req.body.keys; // This is a sample input value.
  const googleSheetClient = await _getGoogleSheetClient();

  const thing = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!G:G` });

  let json = JSON.parse(thing.data.values[inputValues][0]);

  json[req.body.def] = (json[req.body.def]-1 < 0) ? 0 : json[req.body.def]-1;

  const { data: { values }} = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName}!${range}` });

  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    resource: {values: values.map((r) => inputValues.includes(r[3]) ? [r[0], r[1], r[2], r[3], r[4], r[5], JSON.stringify(json),r[7],r[8]] : r)},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});

app.post('/upvoteCrit', async (req, res) => {
  console.log(req.body)
  const inputValues = req.body.crit;
  const googleSheetClient = await _getGoogleSheetClient();

  const { data: { values }} = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName2}!${range2}` });

  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName2}!${range2}`,
    resource: {values: values.map((r) => inputValues.includes(r[2]) ? [r[0], parseInt(r[1])+1, r[2]] : r)},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});

app.post('/downvoteCrit', async (req, res) => {
  console.log(req.body)
  const inputValues = req.body.crit;
  const googleSheetClient = await _getGoogleSheetClient();
  
  const { data: { values }} = await googleSheetClient.spreadsheets.values.get({ spreadsheetId: sheetId,
    range: `${tabName2}!${range2}` });

  await googleSheetClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName2}!${range2}`,
    resource: {values: values.map((r) => inputValues.includes(r[2]) ? [r[0], (((parseInt(r[1])-1) < 0) ? 0 : (parseInt(r[1])-1)), r[2]] : r)},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});


app.post('/addCrit', async (req, res) => {
  console.log(req.body)
  let inputValues = req.body.crit;
  inputValues[2] = uuidv4();
  console.log(inputValues)
  const googleSheetClient = await _getGoogleSheetClient();
  

  await googleSheetClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName2}!${range2}`,
    resource: {"majorDimension": "ROWS", 'values':[inputValues]},
    valueInputOption: "USER_ENTERED",
  });
  res.sendStatus(200);
});


async function getSheets(_name, _range) {
  // Generating google sheet client
  const googleSheetClient = await _getGoogleSheetClient();

  // Reading Google Sheet from a specific range
  return await _readGoogleSheet(googleSheetClient, sheetId, _name, _range);
}

async function _getGoogleSheetClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountKeyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({
    version: 'v4',
    auth: authClient,
  });
}

async function _readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
  const res = await googleSheetClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
  });

  return res.data.values;
}

async function _writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
  await googleSheetClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!${range}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      "majorDimension": "ROWS",
      "values": data
    },
  })
}

// Start the server
server.listen(3000, () => {
    console.log('Server started on port 3000');
});
