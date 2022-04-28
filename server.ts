import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();
//const pgp = require('pg-promise')();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.get("/", async (req, res) => {
  res.send("go to endpoint /pastes");
});

async function getResults() {
  let results = [];
  const pastebin_result = await client.query("select * from pastebins");
  const pastebin_rows = pastebin_result.rows;
  const summary_result = await client.query("select * from paste_summary");
  const summary_rows = summary_result.rows;
  results.push({
    pastebin: pastebin_rows,
    summary_result: summary_rows,
  });
  return results;
}

app.get("/pastes", async (req, res) => {
  getResults().then((results) => res.json(results));
});



app.post("/pastes", async (req, res) => {
  let createPastebin =
    "insert into pastebins(title, text_body) values ($1, $2) ";
  let values = req.body;
  const createSummary =
    "insert into paste_summary (summary_id, summary) values ((select id from pastebins order by id desc limit 1), (substring(( select text_body from pastebins order by id desc limit 1), 1, 280)) )";
  const dbres = await client.query(createPastebin, [
    values.title,
    values.text_body,
  ]); // values has to be an array
  const query2 = await client.query(createSummary);
  res.json(dbres.rows);
  console.log(dbres.rows)
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
