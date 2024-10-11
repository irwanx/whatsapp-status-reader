import chalk from 'chalk';

export function logVersionInfo(version, isLatest) {
    const waVersion = chalk.bold.blue(`WA v${version.join(".")}`);
    const latestStatus = isLatest ? chalk.green('Up-to-date') : chalk.red('Outdated');
    const symbol = isLatest ? chalk.green('✔') : chalk.red('✘');

    console.log(`${symbol} ${waVersion} - Status: ${latestStatus}`);
}

export function logUserInfo(sock) {
    const userName = chalk.bold.cyanBright(`\n👤 Nama : ${sock.user.name}`);
    const userNumber = chalk.bold.yellow(`📞 Nomor : ${sock.user.id.split(":")[0]}\n`);
    
    console.log(userName);
    console.log(userNumber);
}