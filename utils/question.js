import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export const question = (text) => new Promise(resolve => rl.question(text, resolve));

export function closeQuestionInterface() {
    rl.close();
}
