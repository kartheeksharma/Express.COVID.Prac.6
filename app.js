const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertObjToResp = (dbObj) => {
  return {
    stateId: dbObj.state_id,
    stateName: dbObj.state_name,
    population: dbObj.population,
    districtId: dbObj.district_id,
    districtName: dbObj.district_name,
    cases: dbObj.cases,
    cured: dbObj.cured,
    active: dbObj.active,
    deaths: dbObj.deaths,
  };
};

//1.List of All states
app.get("/states/", async (request, response) => {
  const allStates = `SElECT *FROM state;`;
  const allStateArr = await db.all(allStates);
  response.send(allStateArr.map((each) => convertObjToResp(each)));
});

//2.Returns state based on stateId
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `SELECT *FROM state
                        WHERE state_id= ${stateId};`;
  const stateDetails = await db.get(stateQuery);
  response.send(convertObjToResp(stateDetails));
});

//3.Create district in district table
app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;
  const addDist = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
                    VALUES('${districtName}', '${stateId}', '${cases}', '${cured}','${active}','${deaths}');`;
  const addDistResp = await db.run(addDist);
  const newDistDetails = addDistResp.lastID;
  response.send("District Successfully Added");
});

//Returns district based on districtId
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const distQuery = `SELECT *FROM district
                        WHERE district_id= ${districtId};`;
  const distDetails = await db.get(distQuery);
  response.send(convertObjToResp(distDetails));
});

//5.Delete district from district table
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const delDist = `DELETE FROM district WHERE district_id= ${districtId};`;
  await db.run(delDist);
  response.send("District Removed");
});

//6.Updates details of district based on districtId
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
  const updateDistQuery = `UPDATE district SET
                            district_name='${districtName}',
                            state_id= '${stateId}',
                            cases= '${cases}',
                            cured='${cured}',
                            active='${active}',
                            deaths='${deaths}'
                            WHERE district_id= ${districtId};`;
  await db.run(updateDistQuery);
  response.send("District Details Updated");
});

//7.Statistics of total cases of particular state
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `SELECT 
                        SUM(cases),
                        SUM(cured),
                        SUM(active),
                        SUM(deaths)
                        FROM district 
                        WHERE state_id=${stateId};`;
  const stateStats = await db.get(stateQuery);
  console.log(stateStats);
  response.send({
    totalCases: stateStats["SUM(cases)"],
    totalCured: stateStats["SUM(cured)"],
    totalActive: stateStats["SUM(active)"],
    totalDeaths: stateStats["SUM(deaths)"],
  });
});

//8.Object containing state name of district based on districtId
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `SELECT state_name FROM state 
                            NATURAL JOIN district 
                            WHERE district_id=${districtId};`;
  const stateNameResp = await db.get(stateNameQuery);
  console.log(stateNameResp);
  response.send(convertObjToResp(stateNameResp));
});

module.exports = app;
