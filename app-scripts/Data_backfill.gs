function getGenData_fromDate_v2(row, datetime, sheetDoc, sheet) {
  datetime = new Date(datetime - 1*60*60*1000)
  sheet.getRange(row, 1).setValue(datetime);
  var thisYear = datetime.getFullYear();
  var thisMonth = (datetime.getMonth() + 1).toString();
  if (thisMonth.length < 2) { thisMonth = "0" + thisMonth; }

  var thisDay = (datetime.getDate()).toString();
  if (thisDay.length < 2) { thisDay = "0" + thisDay; }
  var settlementDate = thisYear + "-" + thisMonth + "-" + thisDay
  var settlementPeriod = (Math.max(datetime.getHours() * 2+1,0)).toString();

  var fuelTypes = getFuelTypes();
  var fuelTypesIdx = getFuelTypesIndex_historicGenData();

  var demand = 0
  for (var f = 1; f < fuelTypes.length; f++) {
    genValue = getGenData_fromHistoric(settlementDate, settlementPeriod, fuelTypes[f])
    if (fuelTypes[f] == "OTHER") {
      genValue = +genValue + +getGenData_fromHistoric(settlementDate, settlementPeriod, "BIOMASS")
    }
    sheet.getRange(row, fuelTypesIdx[f-1]+2).setValue(Math.max(genValue,0));
    demand = demand + parseInt(genValue);
  }
}

function getGenData_fromHistoric(settlementDate, settlementPeriod, fuelTypeString) {
  var htmlDataStream_historic = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom="+settlementDate+"&settlementDateTo="+settlementDate+"&settlementPeriod="+settlementPeriod+"&fuelType="+fuelTypeString

  var historicGenData = UrlFetchApp.fetch(htmlDataStream_historic)
  var historicGenData_json = JSON.parse(historicGenData.toString())

  var data = historicGenData_json[0]
  genValue = data.generation
  Logger.log(fuelTypeString+": "+genValue)
  return genValue
}

function getGenData_fromDate(row, datetime, sheetDoc, sheet) {
  datetime = new Date(datetime - 1*60*60*1000)

  var thisYear = datetime.getFullYear();
  var thisMonth = (datetime.getMonth() + 1).toString();
  if (thisMonth.length < 2) { thisMonth = "0" + thisMonth; }

  var thisDay = (datetime.getDate()).toString();
  if (thisDay.length < 2) { thisDay = "0" + thisDay; }
  var settlementDate = thisYear + "-" + thisMonth + "-" + thisDay
  var settlementPeriod = (Math.max(datetime.getHours() * 2+1,0)).toString();

  var htmlDataStream = "https://api.bmreports.com/BMRS/FUELHH/v1?APIKey=t4ep8lw6etvy3o6&FromDate="+settlementDate+"&ToDate="+settlementDate+"&ServiceType=csv"
  var bmdata = UrlFetchApp.fetch(htmlDataStream);
  var thisData = bmdata.toString();
  thisArray = thisData.split(",");

  startIdx = 2 + (16 * (settlementPeriod - 1))

  sheet.getRange(row,33).setValue("ratified");
  sheet.getRange(row,1).setValue(Utilities.formatDate(datetime, "GMT+1", "dd/MM/yyyy HH:mm:ss"))
  sheet.getRange(row,3).setValue(thisArray[startIdx + 2]);   // CCGT
  sheet.getRange(row,4).setValue(thisArray[startIdx + 9]);   // OCGT
  sheet.getRange(row,5).setValue(thisArray[startIdx + 3]);   // OIL
  sheet.getRange(row,6).setValue(thisArray[startIdx + 4]);   // COAL
  sheet.getRange(row,7).setValue(thisArray[startIdx + 5]);   // NUCLEAR
  sheet.getRange(row,8).setValue(thisArray[startIdx + 6]);   // WIND
  sheet.getRange(row,9).setValue(sheet.getRange(row,36).getValue()); // OFFSHORE WIND
  sheet.getRange(row,10).setValue(thisArray[startIdx + 7]);  // PS
  sheet.getRange(row,11).setValue(thisArray[startIdx + 8]);  // NPSHYD
  var biomassValue = parseInt(String(thisArray[startIdx + 15]).split("FUELHH"))
  var otherValue = parseInt(thisArray[startIdx + 10])
  sheet.getRange(row,12).setValue(otherValue + biomassValue); // OTHER
  sheet.getRange(row,13).setValue(thisArray[startIdx + 11]); // INTFR
  sheet.getRange(row,14).setValue(thisArray[startIdx + 12]); // INTIRL
  sheet.getRange(row,15).setValue(thisArray[startIdx + 13]); // INTNED
  sheet.getRange(row,16).setValue(thisArray[startIdx + 14]); // INTEW
}

//----------------------------------------------------------------------------------------------------------------------------------------------------
function getWindSolarData_fromDate(row, datetime, sheetDoc, sheet) {
  Logger.log("Getting wind and solar data for: "+datetime)
  datetime = new Date(datetime - 1*60*60*1000)
  sheet.getRange(row,34).setValue("ratified");
  var thisYear = datetime.getFullYear();
  var thisMonth = (datetime.getMonth() + 1).toString();
  if (thisMonth.length < 2) { thisMonth = "0" + thisMonth; }

  var thisDay = (datetime.getDate()).toString();
  if (thisDay.length < 2) { thisDay = "0" + thisDay; }
  var settlementDate = thisYear + "-" + thisMonth + "-" + thisDay
  var settlementPeriod  = (Math.max(datetime.getHours() * 2+1,0)).toString();
  var settlementPeriod2 = (Math.max(datetime.getHours() * 2+2,0)).toString();
  var settlementPeriod3 = (Math.max(datetime.getHours() * 2,0)).toString();

  var htmlDataStream  = "https://api.bmreports.com:443/BMRS/B1630/v1?APIKey=t4ep8lw6etvy3o6&SettlementDate="+settlementDate+"&Period="+settlementPeriod+"&ServiceType=csv"
  var htmlDataStream2 = "https://api.bmreports.com:443/BMRS/B1630/v1?APIKey=t4ep8lw6etvy3o6&SettlementDate="+settlementDate+"&Period="+settlementPeriod2+"&ServiceType=csv"
  var htmlDataStream3 = "https://api.bmreports.com:443/BMRS/B1630/v1?APIKey=t4ep8lw6etvy3o6&SettlementDate="+settlementDate+"&Period="+settlementPeriod3+"&ServiceType=csv"

  var thisArray1 = UrlFetchApp.fetch(htmlDataStream).toString().split(",");
  var thisArray2 = UrlFetchApp.fetch(htmlDataStream2).toString().split(",");
  var thisArray3 = UrlFetchApp.fetch(htmlDataStream3).toString().split(",");

  solar = checkGenSolarWind("Solar generation", thisArray1, thisArray2, thisArray3, 4)
  if (sheet.getRange(row,2).getValue() == 0 || isNaN(sheet.getRange(row,2).getValue())) {
    sheet.getRange(row,2).setValue(solar);
  }
  sheet.getRange(row,39).setValue(solar);

  onshoreWind = checkGenSolarWind("\"Wind Onshore\"", thisArray1, thisArray2, thisArray3, 3)
  sheet.getRange(row,40).setValue(onshoreWind);

  offshoreWind = checkGenSolarWind("\"Wind Offshore\"", thisArray1, thisArray2, thisArray3, 3)
  sheet.getRange(row,41).setValue(offshoreWind);
  sheet.getRange(row,9).setValue(Math.round(offshoreWind));
}

// v2 from ChatGPT
function getWindSolarData_fromDate_v2(row, datetime, sheetDoc, sheet) {
  Logger.log("Getting wind and solar data for: " + datetime);
  datetime = new Date(datetime.getTime() - 60 * 60 * 1000);
  sheet.getRange(row, 34).setValue("ratified");

  const year  = datetime.getUTCFullYear();
  const month = String(datetime.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(datetime.getUTCDate()).padStart(2, "0");
  const hour  = datetime.getUTCHours();
  const settlementDate   = `${year}-${month}-${day}`;
  const settlementPeriod = hour * 2 + 1;

  Logger.log(`SettlementDate=${settlementDate}, Period=${settlementPeriod}`);

  const url =
    "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH" +
    `?settlementDate=${settlementDate}` +
    `&settlementPeriod=${settlementPeriod}`;

  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { "Accept": "application/json" }
  });

  const status = response.getResponseCode();
  const body   = response.getContentText();

  if (status !== 200) {
    Logger.log("API error: " + status);
    Logger.log(body);
    return;
  }

  const json = JSON.parse(body);

  let solar = 0, onshoreWind = 0, offshoreWind = 0;
  json.data.forEach(r => {
    if (r.fuelType === "Solar")        solar        += r.quantity;
    if (r.fuelType === "Wind Onshore") onshoreWind  += r.quantity;
    if (r.fuelType === "Wind Offshore") offshoreWind += r.quantity;
  });

  if (sheet.getRange(row, 2).getValue() === 0 || isNaN(sheet.getRange(row, 2).getValue())) {
    sheet.getRange(row, 2).setValue(solar);
  }
  sheet.getRange(row, 39).setValue(solar);
  sheet.getRange(row, 40).setValue(onshoreWind);
  sheet.getRange(row, 41).setValue(offshoreWind);
  sheet.getRange(row, 9).setValue(Math.round(offshoreWind));

  Logger.log(`Solar=${solar}, Onshore=${onshoreWind}, Offshore=${offshoreWind}`);
}
