const express = require("express");
//google
const { google } = require("googleapis");
const path = require('path');
const fs = require("fs");
const readline = require("readline");

const child_process = require('child_process')

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

let tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

let access_token;
// Load client secrets from a local file.
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "urn:ietf:wg:oauth:2.0:oob"
    // redirect_uris[0]
  );
  
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    client_token = JSON.parse(token);
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "online",
    scope: SCOPES,
  });

  console.log("No Previous Token, Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function getCalendar(auth) {
  return google.calendar({ version: "v3", auth });
}

function main(oauth2Client) {

  // orig

  var handlebars = require("express-handlebars").create({
    defaultLayout: "main",
  });

  const path = require("path");
  const app = express();
  const port = 3000;


  //goolge calendar
  // const oauth2Client = new OAuth2(
  //   "362092880945-rvd8u2vh1aeib13lqurma9p81hnot2sp.apps.googleusercontent.com",
  //   "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"
  // );

  // oauth2Client.setCredentials({
  //   refresh_token:
  //     "1//06k8bO2Dq6d7dCgYIARAAGAYSNwF-L9Ir3rKBYt33J_QLUwuiTbfr6ZpxwXDIIwTz0r98xxEhiIPI8OYuhxpXdc68rWtPyzqA0_M",
  // });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  var eventList = [];

  app.engine("handlebars", handlebars.engine);
  app.set("view engine", "handlebars");
  app.set("views", path.join(__dirname, "views"));

  app.use(express.static("public"));

  app.get("/", (req, res) => {
    // Call the calendar api to fetch list of events
    calendar.events.list(
      {
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 100, //you can change this value
        singleEvents: true,
        orderBy: "startTime",
      },
      function (err, response) {
        if (err) return console.log("The API returned an error: " + err);
        const events = response.data.items; //get all events data, you can use this data to display on your page

        //there is a example of how to display specific data and how to process all data
        if (events.length) {
          //events array name and date, if date is null then add name the date
          eventList = events.map((event) => {
            if (event.start.dateTime) {
              // datetime to parse time and date
              const startTime = event.start.dateTime.split("T")[1].split("-")[0];
              const endTime = event.end.dateTime.split("T")[1].split("-")[0];
              //time only hour and minute
              const startTimeUp =
                startTime.split(":")[0] + ":" + startTime.split(":")[1];
              const endTimeUp =
                endTime.split(":")[0] + ":" + endTime.split(":")[1];
              return {
                name: event.summary + " (" + startTimeUp + "-" + endTimeUp + ")",
                date: event.start.dateTime.split("T")[0],
              };
            } else {
              return {
                name: event.summary,
                date: event.start.date,
              };
            }
          });
        } else {
          console.log("No upcoming events found.");
        }
        //render page with data, look handlebars file
        res.render("index", { eventList: eventList });
      }
    );
  });

  app.listen(port, () => {
    console.log(`Example app listening on http://localhost:${port}/!`);
    child_process.exec('start ' + `http://localhost:${port}/`);
  });
}







