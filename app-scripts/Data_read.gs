// ELEXON DATA - READ
function getDataFromElexon() {
  var bmdata = UrlFetchApp.fetch("https://downloads.elexonportal.co.uk/fuel/download/latest?key=vjm1qyp76h2kxlf");
  var thisData = bmdata.toString();
  return thisData
}

function getDataFromElexon_v2() {
  var bmdata = UrlFetchApp.fetch("https://data.elexon.co.uk/bmrs/api/v1/generation/outturn/current?format=json")
  return bmdata
}

// ELEXON DATA - PROCESS
function getGenValue_v2(bmData, fuelType) {
  var obj = JSON.parse(bmData);
  metaArray = obj.meta;

  var thisData = obj.filter(function(item) {
    return item.fuelType === fuelType;
  });

  if (thisData.length > 0) {
    var thisUsage = thisData[0].currentUsage;
    Logger.log('Current Usage for ' + fuelType + ":" + thisUsage);
  } else {
    Logger.log(fuelType + ' data not found');
    var thisUsage = 0
  }
  return thisUsage
}

// PV DATA
function getPVValue() {
  Logger.log("Getting PV Value")
  var pvdata = UrlFetchApp.fetch('https://api0.solar.sheffield.ac.uk/pvlive/api/v4/pes/0').toString();

  var obj = JSON.parse(pvdata);
  var dataArray = obj.data[0];
  var pvValue = dataArray[2];

  if (pvValue < 0) { pvValue = 0; }
  Logger.log("... PV Value Found: " + pvValue + "MW")
  return pvValue;
}

function getPVValue_v3() {
  Logger.log("Getting PV Value")
  var pvdata = UrlFetchApp.fetch('https://api0.solar.sheffield.ac.uk/pvlive/api/v4/pes/0').toString();
  Logger.log("Found PV Data:")
  Logger.log(pvdata);

  var obj = JSON.parse(pvdata);
  metaArray = obj.meta;
  for (var i = 0; i < metaArray.length; i++) {
    if (metaArray[i] == 'generation_mw') { var dataIdx = i; }
  }

  var dataArray = obj.data[0];
  var pvValue = dataArray[dataIdx];
  if (pvValue < 0) { pvValue = 0; }
  Logger.log("... PV Value Found: " + pvValue + "MW")
  return pvValue;
}

function getPVValue_v4() {
  Logger.log("Getting PV Value")
  var pvdata = UrlFetchApp.fetch('https://api0.solar.sheffield.ac.uk/pvlive/api/v4/pes/0').toString();
  Logger.log("Found PV Data:")
  Logger.log(pvdata);

  var obj = JSON.parse(pvdata);
  metaArray = obj.meta;
  for (var i = 0; i < metaArray.length; i++) {
    if (metaArray[i] == 'generation_mw') { var dataIdx = i; }
  }

  var dataArray = obj.data[0];
  var pvValue = dataArray[dataIdx];
  if (pvValue < 0) { pvValue = 0; }
  Logger.log("... PV Value Found: " + pvValue + "MW")
  return pvValue;
}

function getPVValue_v5() {
  // used from 18th July 2024
  Logger.log("Getting PV Value")
  var pvdata = UrlFetchApp.fetch('https://api.pvlive.uk/pvlive/api/v4/pes/0').toString();
  Logger.log("Found PV Data:")
  Logger.log(pvdata);

  var obj = JSON.parse(pvdata);
  metaArray = obj.meta;
  for (var i = 0; i < metaArray.length; i++) {
    if (metaArray[i] == 'generation_mw') { var dataIdx = i; }
  }

  var dataArray = obj.data[0];
  var pvValue = dataArray[dataIdx];
  if (pvValue < 0) { pvValue = 0; }
  Logger.log("... PV Value Found: " + pvValue + "MW")
  return pvValue;
}

// Fuel Types list
function getFuelTypes() {
  var fuelTypes = ["PV","CCGT","OCGT","OIL","COAL","NUCLEAR","WIND","PS","NPSHYD","OTHER","INTFR","INTIRL","INTNED","INTEW","INTNEM","INTIFA2","INTNSL","INTVKL","INTGRNL"];
  return fuelTypes
}

function getFuelTypesIndex() {
  var fuelTypesIdx = [1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20];
  return fuelTypesIdx
}

function getFuelTypesIndex_historicGenData() {
  var fuelTypesIdx = [1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20];
  return fuelTypesIdx
}

function getWindSolarData() {
  var datetime = new Date();
  datetime = new Date(datetime - 1*60*60*1000)
  var dateTimeOutput = Utilities.formatDate(datetime, "GMT+1", "dd/MM/yyyy HH:mm:ss")
  var thisYear = datetime.getFullYear();
  var thisMonth = (datetime.getMonth() + 1).toString();
  if (thisMonth.length < 2) { thisMonth = "0" + thisMonth; }

  var thisDay = (datetime.getDate()).toString();
  if (thisDay.length < 2) { thisDay = "0" + thisDay; }
  var settlementDate = thisYear + "-" + thisMonth + "-" + thisDay
  var settlementPeriod = (Math.max(datetime.getHours() * 2+1,0)).toString();

  var htmlDataStream = "https://api.bmreports.com:443/BMRS/B1630/v1?APIKey=t4ep8lw6etvy3o6&SettlementDate="+settlementDate+"&Period="+settlementPeriod+"&ServiceType=csv"

  var bmdata = UrlFetchApp.fetch(htmlDataStream);
  var output = bmdata.getContentText();
  var thisData = bmdata.toString();
  thisArray = thisData.split(",");

  solar = parseFloat(thisArray[thisArray.indexOf("Solar generation")+4]);
  onshoreWind = parseFloat(thisArray[thisArray.indexOf("\"Wind Onshore\"")+3]);
  offshoreWind = parseFloat(thisArray[thisArray.indexOf("\"Wind Offshore\"")+3]);

  var yearStart = new Date(datetime.getFullYear(),0,0,0,0,0);
  var dayOfYear = Math.floor((datetime.valueOf() - yearStart.valueOf())/(1000 * 60*60*24));
  var hour = datetime.getHours();
  if (hour > 0) {
    var outputrow = ((dayOfYear - 1) * 24) + hour + 24 + (8760 * (datetime.getFullYear() - 2016))
  } else {
    var outputrow = ((dayOfYear - 1) * 24) + hour + 24 + (8760 * (datetime.getFullYear() - 2016) + 24)
  }

  var sheetDoc = SpreadsheetApp.openById('1SGAKNij2t2YgDqiKE6l2GP5HOzydst9WW3OY0cvEQwE');
  var rowsheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName('Settings'));
  outputrow = rowsheet.getRange(29,4).getValue();

  const d = new Date();
  let year = d.getFullYear();
  var dataSheetName = year.toString()
  var sheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName(dataSheetName));

  sheet.getRange(outputrow,39).setValue(solar);
  if (sheet.getRange(outputrow,2).getValue() == 0) { sheet.getRange(outputrow,2).setValue(solar); }
  sheet.getRange(outputrow,40).setValue(onshoreWind);
  sheet.getRange(outputrow,41).setValue(offshoreWind);
  sheet.getRange(outputrow,9).setValue(Math.round(offshoreWind));
  sheet.getRange(outputrow,38).setValue(htmlDataStream);
}
