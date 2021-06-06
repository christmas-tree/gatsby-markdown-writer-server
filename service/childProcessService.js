const {spawn} = require('child_process');
const global = require('../utils/global');
const {CHRISTMAS_TREE_ROOT} = require('./config');
const cpService = {};

let runningProcess;

const broadcast = (event, text) => {
    if (!global._io) {
        console.log("IO not initiated for global");
        return;
    }
    global._io.emit(event, text.toString());
}

const spawnAndStream = async (command, options) => new Promise(((resolve, reject) => {
    console.log(`Starting child process with command '${command} ${options.join(' ')}'.`);
    const child = spawn(command, options, {cwd: CHRISTMAS_TREE_ROOT});
    runningProcess = child;

    child.stdout.on('data', (data) => {
        broadcast('stdout', data);
    });
    child.stderr.on('data', (data) => {
        broadcast('stderr', data);
    });
    child.on('error', (error) => {
        broadcast('error', error.message);
        console.error(`error: ${error.message}`);
        runningProcess = null;
        reject(error);
    });
    child.on('close', (code) => {
        if (code == null) {
            code = "Terminated";
        }
        console.log(`child process exited with code ${code}`);
        broadcast('close',`child process exited with code ${code}`);
        runningProcess = null;
        if (code === 0) {
            resolve(code);
        } else {
            reject(code);
        }
    });
}));

cpService.runDeploy = () => {
    const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    spawnAndStream('git', ['checkout', 'master'])
        .then(() => {
            return spawnAndStream(npmCommand, ['run', 'deploy']);
        })
        .catch((e) => {
            console.error("Process failed due to " + e.toString());
        });
}

cpService.runPreview = () => {
    const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    spawnAndStream('git', ['checkout', 'master'])
        .then(() => {
            return spawnAndStream(npmCommand, ['run', 'developPublic']);
        })
        .catch((e) => {
            console.error("Process failed due to " + e.toString());
        });
}

cpService.runClean = () => {
    const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    spawnAndStream('git', ['checkout', 'master'])
        .then(() => {
            return spawnAndStream(npmCommand, ['run', 'clean']);
        })
        .catch((e) => {
            console.error("Process failed due to " + e.toString());
        });
}

cpService.kill = () => {
    if (!runningProcess) {
        console.log("No running process");
        return;
    }
    runningProcess.kill();
}

module.exports = cpService;