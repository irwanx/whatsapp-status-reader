export function extractMessageBody(msg) {
    const type = Object.entries(msg.message)[0][0];
    const messageContent = msg.message[type];

    switch (type) {
        case 'conversation':
            return messageContent;
        case 'extendedTextMessage':
            return messageContent.text;
        case 'imageMessage':
        case 'videoMessage':
            return messageContent.caption || '';
        case 'templateButtonReplyMessage':
            return messageContent.selectedId;
        case 'buttonsResponseMessage':
            return messageContent.selectedButtonId;
        case 'listResponseMessage':
            return messageContent.singleSelectReply?.selectedRowId || '';
        case 'viewOnceMessageV2':
            const innerMessageType = Object.entries(messageContent.message)[0][0];
            return messageContent.message[innerMessageType];
        default:
            return '';
    }
}
