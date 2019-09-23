const electron = require("electron");
const { app, BrowserWindow, Tray, Menu } = electron;
const wallpaper = require("wallpaper");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const APP_NAME = "wallpaper-changer";
const INDEX_FILE_URL = "index.html";
const ICON_FILE_URL = "icon.png";
const WALLPAPER_FOLDER = "images";

let mainWindow, tray, appDataPath;

app.on("ready", () => {
  setVariables();
  createMainWindow();
  createTray();
  checkWallpaper();
});

function setVariables() {
  appDataPath = path.resolve(app.getPath('appData'), APP_NAME);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({ show: false });
  mainWindow.loadFile(INDEX_FILE_URL);
}

function createTray() {
  tray = new Tray(path.resolve(__dirname, ICON_FILE_URL));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Set new wallpaper",
      click() {
        {
          setNewWallpaper();
        }
      }
    },
    { type: "separator" },
    {
      label: "Exit",
      click() {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function checkWallpaper() {
  isCurrentWallpaperSetToday().then(setToday => {
    if (!setToday) {
      setNewWallpaper();
    }
  });
}

async function isCurrentWallpaperSetToday() {
  const wallpaperPath = await wallpaper.get();
  const wp = wallpaperPath
    .split("\\")
    .pop()
    .split("/")
    .pop()
    .split(".")[0];

  return new Promise(resolve => {
    resolve(isToday(wp));
  });
}

function setNewWallpaper() {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  const id = Date.now();
  const url = `https://picsum.photos/seed/${id}/${width}/${height}/`;

  downloadRandomImage(url, id)
    .then(() => {
      setWallpaper(id);
    })
    .catch(() => setWallpaper(getRandomId()));
}

function getDownloadedWallpapers() {
  return fs.readdirSync(path.resolve(appDataPath,WALLPAPER_FOLDER));
}

function getRandomId() {
  const files = getDownloadedWallpapers();
  const randomWallpaper = files[Math.floor(Math.random() * files.length)];

  return randomWallpaper.split(".")[0];
}

function setWallpaper(id) {
  wallpaper.set(path.resolve(appDataPath, WALLPAPER_FOLDER, `${id}.jpg`));
}

function isToday(timestamp) {
  const today = new Date();
  const date = new Date(parseInt(timestamp));

  return (
    date.getDate() == today.getDate() &&
    date.getMonth() == today.getMonth() &&
    date.getFullYear() == today.getFullYear()
  );
}

async function downloadRandomImage(url, id) {
  if (!fs.existsSync(path.resolve(appDataPath, WALLPAPER_FOLDER))) {
    fs.mkdirSync(path.resolve(appDataPath, WALLPAPER_FOLDER));
  }

  const pathToSave = path.resolve(appDataPath, WALLPAPER_FOLDER, `${id}.jpg`);

  const response = await axios({
    method: "GET",
    url: url,
    responseType: "stream"
  });

  response.data.pipe(fs.createWriteStream(pathToSave));

  return new Promise((resolve, reject) => {
    response.data.on("end", () => {
      resolve();
    });
    response.data.on("error", () => reject(error));
  });
}
