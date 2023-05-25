const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
const dbPath = path.join(__dirname, "covid19India.db");

app.use(express.json());
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.get("/states/", async (request, response) => {
  const listOfAllStates = `SELECT state_id as stateId, state_name as stateName, population
  FROM state`;
  const listDetails = await db.all(listOfAllStates);
  response.send(listDetails);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetails = `
    SELECT state_id as stateId, 
    state_name as stateName,population
     FROM state WHERE state_id = '${stateId}';`;
  const state = await db.get(stateDetails);
  response.send(state);
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictDetails = `INSERT INTO district 
    (district_name, state_id, cases, cured, active, deaths)
    VALUES
    (
       '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;

  const dbResponse = await db.run(addDistrictDetails);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `
    SELECT district_id as districtId, district_name as districtName, 
    state_id as stateId, cases, cured, active, deaths FROM district WHERE
    district_id = ${districtId};`;
  const district = await db.get(districtDetails);
  response.send(district);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id = '${districtId}';`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE district SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT
    sum(cases),
    sum(cured),
    sum(active),
    sum(deaths) FROM district WHERE state_id = ${stateId};`;
  const stats = await db.get(getStateStatsQuery);

  console.log(stats);

  response.send({
    totalCases: stats["sum(cases)"],
    totalCured: stats["sum(cured)"],
    totalActive: stats["sum(active)"],
    totalDeaths: stats["sum(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictId = `
    SELECT state_id FROM district where district_id = ${districtId};`;
  const districtGot = await db.get(getDistrictId);

  const getStateNameQuery = `SELECT state_name as stateName FROM state 
    WHERE state_id = ${districtGot.state_id};`;
  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
