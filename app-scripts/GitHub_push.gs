// ── Config ──────────────────────────────────────────────────────────────────
const GITHUB_OWNER  = 'afcrossland';
const GITHUB_REPO   = 'mygridgb';
const GITHUB_BRANCH = 'main';

const SHEETS = [
  { file: 'data/live-mix.json',            id: '1v8KovUBgNq6M_WcGiUQi-MdysmsiDKFIfAdg961D1LA', tab: null },
  { file: 'data/annual-history.json',      id: '1U8ywTGM2IO6Wc4juDb6rMP0me2hd58HEenOSqGpYiNM', tab: null },
  { file: 'data/stack-timeseries.json',    id: '136P7ali5jDYLpBgAxLEE0jVrf3A4FljDZF528ftaxeQ', tab: null },
  { file: 'data/28day-treemap.json',       id: '1nh3oCqRrDg0pyhByZt9Ssga11mV4ptTybTzBIjmTmZw', tab: null },
  { file: 'data/28day-carbon.json',        id: '1Xx0Crp8hZRWoFOb_NQ6kptP69EplFBjUQnLUekbYJag', tab: null },
  { file: 'data/12month-generation.json',  id: '1XmfoB1pj75UMhM9d2r2KbA0P-TAjUddyY0iAuFmgCVw', tab: 'Last%203%20years' },
  { file: 'data/12month-carbon.json',      id: '1M7mmIpZuKLk2GyRSfsRhQgTQiZoGnLI3P5HRiQWxGoc', tab: 'Last%203%20years' },
  { file: 'data/historical-twh.json',      id: '1vWKOAe4-RdCCYmmCiU0CQdYxJmJcBJjCmOPjXfS9Bek', tab: null },
  { file: 'data/historical-mix-pct.json',  id: '1_dUFSVKiTItbbuyQNc2XuhQ1tmkQBBbgvQwqmekdfvU', tab: null },
  { file: 'data/historical-co2.json',      id: '1wg4sY1wskCJtosHtozDqxyudXBDR53LHgQP0Q5Hu_8g', tab: null },
  { file: 'data/2030-mix.json',            id: '1u35y6W2NqBTa5knVrqsYybjIGTPCwjBrIqg0rIZKLes', tab: null },
  { file: 'data/2030-timeseries.json',     id: '1ctbznBuW040HtFabgrTu4qDo2TfbsqPZvDiU8rglNRc', tab: null },
  { file: 'data/2030-curtailment.json',    id: '12Rw_OnA3qKUvMuzcMhfvW0UyAYXxx8HrcHxxk9VidYA', tab: null },
  { file: 'data/carbon-tracker-bar.json',  id: '1w2bX1YwhPYUOkxayfJtmNIG_SvCj8UDXxzTy5pxZEqM', tab: null },
  { file: 'data/carbon-tracker-lines.json',id: '1ItQ1pZ2JU0itdmcFveTqAtyg0mEyTAR5q54TatkS9D0', tab: null },
];

// ── Main: runs on 30-min trigger ───────────────────────────────────────────
function pushAllSheetsToGitHub() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');

  SHEETS.forEach(function(s) {
    try {
      var content = fetchSheetData(s.id, s.tab);
      pushToGitHub(token, s.file, content);
      Logger.log('OK: ' + s.file);
    } catch(e) {
      Logger.log('FAILED: ' + s.file + ' — ' + e.message);
    }
  });
}

// ── Fetch sheet as gviz JSON string ────────────────────────────────────────
function fetchSheetData(sheetId, tab) {
  var url = 'https://docs.google.com/spreadsheets/d/' + sheetId +
            '/gviz/tq?tqx=out:json' +
            (tab ? '&sheet=' + tab : '&gid=0');
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('HTTP ' + response.getResponseCode());
  }
  return response.getContentText();
}

// ── Push a file to GitHub (create or update) ───────────────────────────────
function pushToGitHub(token, path, content) {
  var apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' +
               GITHUB_REPO + '/contents/' + path;
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github+json'
  };

  // Get current SHA (needed if file already exists)
  var getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + GITHUB_BRANCH, {
    headers: headers,
    muteHttpExceptions: true
  });
  var sha = null;
  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha;
  }

  var payload = {
    message: 'data: auto-update ' + path,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch:  GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  var putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (putResp.getResponseCode() !== 200 && putResp.getResponseCode() !== 201) {
    throw new Error('GitHub PUT ' + putResp.getResponseCode() + ': ' + putResp.getContentText());
  }
}
