const { app, BrowserWindow, ipcMain, } = require('electron')
const { download } = require('electron-dl');
const path = require("path")
const { spawn } = require('child_process');
const fetch = require("cross-fetch")
const fs = require("fs")

const createWindow = async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        resizable: false,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            devTools: true,
            contextIsolation: false
        }
    })

    //auto update libs
    const x = await fetch("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
        method: "GET"
    })
    let version = (await x.json()).tag_name
    if (version != fs.readFileSync(path.join(__dirname, "../version.txt"))) {
        win.loadFile(path.join(__dirname, './public/download_update.html'))
        let updatelink = "https://github.com/yt-dlp/yt-dlp/releases/download/" + version + "/yt-dlp.exe"
        download(win, updatelink)
            .then(dl => {
                const downloadPath = dl.getSavePath();
                const newPath = path.join(__dirname, "../libs/" + 'yt-dlp.exe');

                fs.rename(downloadPath, newPath, (err) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log('Download file and renamed successfully!');
                    }
                });
                //load download page
                fs.writeFileSync(path.join(__dirname, "../version.txt"), version)
                win.loadFile(path.join(__dirname, './public/index.html'))
            })
            .catch(err => {
                console.error('Error downloading update:', err);
            });
    } else {
        //load download page
        console.log('No update available.');
        win.loadFile(path.join(__dirname, './public/index.html'))
    }



    //ipc
    ipcMain.on('download_', (event, message) => {
        let data = JSON.parse(message)
        _download(data.link, data.quality, data.type, event)
    });

    ipcMain.on('close-app', () => {
        app.quit();
    });
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

function _download(link, quality = "1080", type = "vid", event) {
    if (type == "vid") {
        const command = path.join(__dirname, '..//libs') + '\\yt-dlp.exe'
        const args = [link, `-f`, `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`, '-o', path.join(__dirname, '../../output/%(title)s.%(ext)s')];

        const childProcess = spawn(command, args);

        childProcess.stdout.on('data', (data) => {
            let _data = data.toString()
            console.log(_data)
            if (_data.match(/(\[download\]|\[youtube\])/g)) {
                if (!_data.match(/Destination/g)) {
                    event.reply('download_process', JSON.stringify({ type: 0, data: _data }));
                }
            }
        });

        childProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        childProcess.on('error', (error) => {
            console.error(`Error: ${error.message}`);

            event.reply('download_process', JSON.stringify({ type: 2, data: error.message }));
        });

        childProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            if (code == 0) {
                event.reply('download_process', JSON.stringify({ type: 1, data: "Download is done!\nPlease check in your output folder!" }));
            }
            if (code == 1) {
                event.reply('download_process', JSON.stringify({ type: 1, data: "Can't download" }));
            }
        });

    } else {
        const command = path.join(__dirname, '../libs') + '\\yt-dlp.exe'
        const args = ['--extract-audio', `--audio-format`, type , link, '-o', path.join(__dirname, '../../output/%(title)s.%(ext)s')];

        const childProcess = spawn(command, args);

        childProcess.stdout.on('data', (data) => {
            let _data = data.toString()
            console.log(_data)
            if (_data.match(/(\[download\]|\[youtube\])/g)) {
                if (!_data.match(/Destination/g)) {
                    event.reply('download_process', JSON.stringify({ type: 0, data: _data }));
                }
            }
        });

        childProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        childProcess.on('error', (error) => {
            console.error(`Error: ${error.message}`);

            event.reply('download_process', JSON.stringify({ type: 2, data: error.message }));
        });

        childProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            if (code == 0) {
                event.reply('download_process', JSON.stringify({ type: 1, data: "Download is done!\nPlease check in your output folder!" }));
            }
            if (code == 1) {
                event.reply('download_process', JSON.stringify({ type: 1, data: "Can't download" }));
            }
        });
    }
}