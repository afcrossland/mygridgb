function hourlyData() {
  // runs every hour to:
    // 1. Pull data from BM Reports and PV Live
    // 2. Write that data to the Google Sheet database.
    // 3. Fill blank data

  // determine output row
    var datetime = new Date();
    var dateTimeOutput = Utilities.formatDate(datetime, "GMT+1", "dd/MM/yyyy HH:mm:ss");
    var outputrow = getHourOfYear(datetime);

  // load Google Sheet database
    var sheetDoc = SpreadsheetApp.openById('1SGAKNij2t2YgDqiKE6l2GP5HOzydst9WW3OY0cvEQwE');
    var yearAsString = Utilities.formatDate(datetime, "GMT+1", "yyyy");
    var sheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName(yearAsString));

  // get list of fuel types
    var fuelTypes = getFuelTypes();
    var fuelTypesIdx = getFuelTypesIndex();

  // get data from bm reports
    var thisData = getDataFromElexon_v2();
    Logger.log("Getting data from Elexon")

  // get PV generation from PV live
    var thisGenValue = [];
    try {
      thisGenValue[0] = parseInt(getPVValue_v5());
    }
      catch(err) {
        thisGenValue[0] = 0;
        }

  // write data to google sheet database
    sheet.getRange(outputrow,1).setValue(dateTimeOutput);
    sheet.getRange(outputrow,2).setValue(thisGenValue[0]);

    var demand = 0;
    for (var f = 1; f < fuelTypes.length; f++)
    {
      var output = getGenValue_v2(thisData,fuelTypes[f]);
      if (fuelTypes[f] == "OTHER")
      {
        output = +output + +getGenValue_v2(thisData,"BIOMASS");
      }

      sheet.getRange(outputrow, fuelTypesIdx[f-1]+2).setValue(output);
      demand = demand + parseInt(output);
    }

  // show summary
    summaryColumns(sheet, outputrow, datetime, demand);

  // INSERT CODE TO WRITE TO BQ
  // [INSERT HERE]

  // get wind and solar data using new method
    //findBlanks_windSolar(outputrow-2); - not working
    findBlanks_gen()
}

//----------------------------------------------------------------------------------------------------------------------------------------------------
function liveData() {
  // Get data needed for Twitter and write to Twitter processing sheet
    Logger.log("Getting Live Data")

  // load output spreadsheet
    var sheetDoc = SpreadsheetApp.openById('1SGAKNij2t2YgDqiKE6l2GP5HOzydst9WW3OY0cvEQwE');
    var sheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName("Live Data"));

  // load tweet spreadsheet
    var sheetDoc_tweet = SpreadsheetApp.openById('1EBi94Eds-Kcwzpq-fdsvwXvhBJ2Dut3xnUO5Iq9DDD4');
    var sheet_tweet = sheetDoc_tweet.setActiveSheet(sheetDoc_tweet.getSheetByName("liveData"));

  // fuel types and latest generation data
    var fuelTypes = getFuelTypes()
    Logger.log(fuelTypes)
    var bmDataString = getDataFromElexon_v2();

    // get PV generation from PV live
    try {
      pvdata = parseInt(getPVValue_v5());
    }
      catch(err) {
        pvdata = 0;
        }

    sheet_tweet.getRange(7,2).setValue(bmDataString)
    sheet_tweet.getRange(8,2).setValue(pvdata)

  // get PV value
    try {
      var pvValue = parseInt(getPVValue_v5());
    }
      catch(err) {
        var pvValue = 0;
        }

  // live data for Twitter
    Logger.log("Writing data to Tweet Sheet")
    sheet_tweet.getRange(3,2).setValue(pvValue);

    for (var f = 1; f < fuelTypes.length; f++)
    {
      output = getGenValue_v2(bmDataString,fuelTypes[f]);
      if (fuelTypes[f] == "OTHER")
      {
        output = +output + +getGenValue_v2(bmDataString,"BIOMASS");
        Logger.log(output)
      }
      sheet_tweet.getRange(2,f+2).setValue(fuelTypes[f]);
      sheet_tweet.getRange(3,f+2).setValue(output);
    }

  // live data for website
    Logger.log("Writing data to Master")
    var outputrow = 9;
    var outputColStart = 3;
    sheet.getRange(outputrow-1,outputColStart).setValue("PV");
    sheet.getRange(outputrow,outputColStart).setValue(pvValue);

    for (var f = 1; f < fuelTypes.length; f++)
    {
      output = getGenValue_v2(bmDataString,fuelTypes[f]);
      if (fuelTypes[f] == "OTHER")
      {
        output = +output + +getGenValue_v2(bmDataString,"BIOMASS");
        Logger.log(output)
      }
      sheet.getRange(outputrow-1, f+outputColStart).setValue(fuelTypes[f]);
      sheet.getRange(outputrow, f+outputColStart).setValue(output);
    }

    var timeNow = new Date();
    sheet_tweet.getRange(4,2).setValue(timeNow);
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

function findBlanks_windSolar(outputrow) {
  Logger.log("Finding Blank Wind and Solar Data")
  var sheetDoc = SpreadsheetApp.openById('1SGAKNij2t2YgDqiKE6l2GP5HOzydst9WW3OY0cvEQwE');

  const d = new Date();
  let year = d.getFullYear();

  var dataSheetName = year.toString()

  var dataSheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName(dataSheetName));
  var settingsSheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName('Settings'));

  var blankCol = 9
  var blankCount = 50;
  var maxRows = 50;
  var bottomRow = settingsSheet.getRange(46,3).getValue();
  r = bottomRow - 50;
  Logger.log("Bottom row for Wind/Solar is: " + bottomRow)

  blankValue = 0

  var rowCount = 0;
  while (blankCount > 0 && rowCount <= maxRows && r > 1) {
    if (dataSheet.getRange(r,blankCol).getValue() == 0 || isNaN(dataSheet.getRange(r,2).getValue())) {
      Logger.log("Error row: "+r)
      getWindSolarData_fromDate_v2(r,dataSheet.getRange(r,30).getValue(),sheetDoc,dataSheet)
      blankCount = blankCount - 1;
    }
    r = r - 1;
    rowCount = rowCount + 1;
  }
}

function findBlanks_gen() {
  var sheetDoc = SpreadsheetApp.openById('1SGAKNij2t2YgDqiKE6l2GP5HOzydst9WW3OY0cvEQwE');

  const d = new Date();
  let year = d.getFullYear();
  var dataSheetName = year.toString()
  var dataSheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName(dataSheetName));
  var settingsSheet = sheetDoc.setActiveSheet(sheetDoc.getSheetByName('Settings'));

  var blankCol = 22
  var blankCount = 100;
  var bottomRow = settingsSheet.getRange(46,3).getValue()
  var rowCountMax = 10
  var r = bottomRow
  Logger.log("Bottom row for Generation is: " + bottomRow)

  blankValue = 0

  var rowCount = 0;
  while (blankCount > 0 && rowCount <= rowCountMax && r > 1) {
    var thisErrorState = String(dataSheet.getRange(r,blankCol).getValue());
    var errorCodeLength = String(thisErrorState).length
    Logger.log("Error State: "+thisErrorState)
    if (thisErrorState == "false") {
      Logger.log("Found missing data")
      getGenData_fromDate_v2(r,dataSheet.getRange(r,30).getValue(),sheetDoc,dataSheet)
      blankCount = blankCount - 1
    }
    r = r - 1;
    rowCount = rowCount + 1
  }
}

//----------------------------------------------------------------------------------------------------------------------------------------------------
function getHourOfYear(datetimenow) {
  var yearStart = new Date(datetimenow.getFullYear(),0,1,0,0,0);
  var hourOfYear = Math.abs(datetimenow.valueOf() - yearStart.valueOf()) / 36e5;
  hourOfYear = Math.floor(hourOfYear) + 2;
  return hourOfYear
}

//----------------------------------------------------------------------------------------------------------------------------------------------------
function checkGenSolarWind(textString, thisArray1, thisArray2, thisArray3, stringLength) {
  var generationValue1 = parseFloat(thisArray1[thisArray1.indexOf(textString)+stringLength]);
  var generationValue2 = parseFloat(thisArray2[thisArray2.indexOf(textString)+stringLength]);
  var generationValue3 = parseFloat(thisArray3[thisArray3.indexOf(textString)+stringLength]);

  if (isNaN(generationValue1)) { generationValue1 = 0; }
  if (isNaN(generationValue2)) { generationValue2 = 0; }
  if (isNaN(generationValue3)) { generationValue3 = 0; }

  generation = Math.max(generationValue1, generationValue2, generationValue3)
  if (isNaN(generation)) { generation = 0 }

  Logger.log(textString + " data: " + generation + ", calculated from: " + generationValue1 + ", " + generationValue2)
  return generation
}

//----------------------------------------------------------------------------------------------------------------------------------------------------
function summaryColumns(sheet, row, datetime, demand) {
  var solarPct = sheet.getRange(row, 2).getValue()/demand
  var windPct = sheet.getRange(row, 8).getValue()/demand
  var hydroPct = sheet.getRange(row, 11).getValue()/demand
  var otherLowCarbonPct = (sheet.getRange(row,7).getValue()+sheet.getRange(row,10).getValue()+sheet.getRange(row,12).getValue()+sheet.getRange(row,13).getValue()+sheet.getRange(row,14).getValue()+sheet.getRange(row,16).getValue())/demand

  sheet.getRange(row, 26).setValue(solarPct)
  sheet.getRange(row, 27).setValue(windPct)
  sheet.getRange(row, 28).setValue(solarPct+windPct+hydroPct)
  sheet.getRange(row, 29).setValue(solarPct+windPct+hydroPct+otherLowCarbonPct)
  sheet.getRange(row, 30).setValue(sheet.getRange(row,1).getValue())

  var weekday = datetime.getDay();
  if (weekday == 0) { weekday = 7 }

  sheet.getRange(row, 23).setValue(datetime.getFullYear());
  sheet.getRange(row, 24).setValue(demand);
  sheet.getRange(row, 25).setValue(datetime.getMonth() + 1);
}

function summaryColumns_v2(sheet, row, datetime) {
  var demand = 0
  for (var c = 2; c <= 16; c++) {
    demand = demand + sheet.getRange(row, c).getValue()
  }

  var solarPct = sheet.getRange(row, 2).getValue()/demand
  var windPct = sheet.getRange(row, 8).getValue()/demand
  var hydroPct = sheet.getRange(row, 11).getValue()/demand
  var otherLowCarbonPct = (sheet.getRange(row,7).getValue()+sheet.getRange(row,10).getValue()+sheet.getRange(row,12).getValue()+sheet.getRange(row,13).getValue()+sheet.getRange(row,14).getValue()+sheet.getRange(row,16).getValue())/demand

  sheet.getRange(row, 21).setValue(solarPct)
  sheet.getRange(row, 22).setValue(windPct)
  sheet.getRange(row, 23).setValue(solarPct+windPct+hydroPct)
  sheet.getRange(row, 24).setValue(solarPct+windPct+hydroPct+otherLowCarbonPct)
  sheet.getRange(row, 25).setValue(sheet.getRange(row,1).getValue())
  sheet.getRange(row, 25).setValue(sheet.getRange(row,1).getValue())
  var weekday = datetime.getDay();
  if (weekday == 0) { weekday = 7 }
  sheet.getRange(row, 26).setValue(sheet.getRange(row,24).getValue())
  if (weekday > 5) { sheet.getRange(row, 26).setValue(0) }
  sheet.getRange(row, 27).setValue(weekday)

  sheet.getRange(row, 18).setValue(datetime.getFullYear());
  sheet.getRange(row, 19).setValue(demand);
  sheet.getRange(row, 20).setValue(datetime.getMonth() + 1);
}
