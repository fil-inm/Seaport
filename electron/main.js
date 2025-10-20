const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let cppProcess;

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    win.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
    cppProcess = spawn(path.join(__dirname, "../backend/build/backend"), {
        stdio: "inherit",
    });

    createWindow();

    app.on("window-all-closed", () => {
        cppProcess.kill();
        app.quit();
    });
});