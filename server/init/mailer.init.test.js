/**
 * @author progmem
 * @date 01.11.17
 */

'use strict';

const mailer = require('./mailer-init');

const TEST_MAIL_ADDRESS_RECIPIENT = 'mail@progmem.de';

// skipped the test for annoyance reasons
test.skip('send test mail', () => {
    const mailOptions = {
        from: mailer.FROM, // sender address
        to: TEST_MAIL_ADDRESS_RECIPIENT, // list of receivers
        subject: 'Test Mail from Astro-Nowte unit test', // Subject line
        text: 'This is a test mail. (Plain-Text Body)', // plain text body
        html: '<b>This is a test mail. (HTML Body)</b>' // html body
    };

    // send mail with defined transport object
    mailer.sendMail(mailOptions, (error, info) => {
        expect(error).toBeNull();
        console.log('you should check if: ' + TEST_MAIL_ADDRESS_RECIPIENT + ' got a mail from: ' + mailer.FROM);
    });
});