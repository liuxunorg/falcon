import path from 'path';
import chromedriver from 'chromedriver';
import webdriver from 'selenium-webdriver';
import {expect} from 'chai';
import electronPath from 'electron-prebuilt';

import {APP_STATUS_CONSTANTS, ENGINES, USER_INPUT_FIELDS} from '../app/constants/constants';
import {CREDENTIALS} from './credentials.js';

// import styles to use for tests
import logoStyles from '../app/components/Settings/EngineSelector/EngineSelector.css';
import btnStyles from '../app/components/Settings/ConnectButton/ConnectButton.css';

chromedriver.start(); // on port 9515
process.on('exit', chromedriver.stop);

const delay = time => new Promise(resolve => setTimeout(resolve, time));

describe('main window', function spec() {
    this.timeout(5000);

    before(async () => {
        await delay(1000); // wait chromedriver start time
        this.driver = new webdriver.Builder()
        .usingServer('http://localhost:9515')
        .withCapabilities({
            chromeOptions: {
                binary: electronPath,
                args: [`app=${path.resolve()}`]
            }
        })
        .forBrowser('electron')
        .build();

        const findels = (args) => this.driver.findElements(args);
        const findel = (args) => this.driver.findElement(args);

        const byClass = (args) => webdriver.By.className(args);
        const byId = (args) => webdriver.By.id(args);
        const byCss = (args) => webdriver.By.css(args);
        const byPath = (args) => webdriver.By.xpath(args);


        // grab group of elements
        this.getLogos = () => findels(byClass(logoStyles.logo));
        this.getInputs = () => findels(byPath('//input'));

        // grab specific element
        this.getLogo = (dialect) => findel(
            byId(`test-logo-${dialect}`)
        );

        this.getInputField = (credential) => findel(
            byId(`test-input-${credential}`)
        );

        this.getConnectBtn = () => findel(
            byId('test-connect-button')
        );

        this.getDatabaseDropdown = () => findel(
            byId('test-database-dropdown')
        );

        this.getDatabaseOptions = () => findel(
            byCss('.Select-option')
        );

        this.getTables = () => findel(
            byId('test-tables')
        );

        this.getLogs = () => findel(
            byId('test-logs')
        );

        this.getErrorMessage = () => findel(
            byId('test-error-message')
        );

        // user inputs
        this.fillInputs = async (testedDialect) => {
            USER_INPUT_FIELDS[testedDialect].forEach(credential => {
                this.getInputField(credential)
                .then(input => input.sendKeys(CREDENTIALS['local'][credential]));
            });
        };

        this.wrongInputs = async (testedDialect) => {
            USER_INPUT_FIELDS[testedDialect].forEach(credential => {
                this.getInputField(credential)
                .then(input => input.sendKeys('blah'));
            });
        };

    });

    // grab property of element
    const getClassOf = (element) => element.getAttribute('class');

    // TODO: replace delay times with a functions that waits for a change

    it('should open window',
    async () => {

        const title = await this.driver.getTitle();

        expect(title).to.equal('Plotly Desktop Connector');

    });

    it('should display five available dialect logos',
    async () => {

        const logos = await this.getLogos();

        expect(logos.length).to.equal(5);

    });

    it('should enter text into the text box',
    async () => {

        const inputs = await this.getInputs();
        const textinput = 'this is an input';

        inputs[0].sendKeys(textinput);
        expect(await inputs[0].getAttribute('value')).to.equal(textinput);

    });

    it('should clear input values if a new database dialect is selected',
    async () => {

        const inputs = await this.getInputs();
        const logos = await this.getLogos();

        logos[1].click();
        expect(await inputs[0].getAttribute('value')).to.equal('');

    });

    it('should have an initial state of disconnected',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.DISCONNECTED}`;
        const btn = await this.getConnectBtn();

        const testClass = await getClassOf(btn);
        expect(testClass).to.contain(expectedClass);

    });

    it('should have updated the config with new dialect value',
    async () => {

        const expectedClass = 'test-consistent-state';
        const testedDialect = ENGINES.MYSQL;
        const logo = await this.getLogo(testedDialect);

        await logo.click()
        .then(await delay(500));
        const testClass = await getClassOf(logo);
        expect(testClass).to.contain(expectedClass);

    });

    it('should connect to the database using the inputs and selected dialect',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.CONNECTED}`;
        const testedDialect = ENGINES.MYSQL;
        const btn = await this.getConnectBtn();

        // click on the evaluated dialect logo
        this.fillInputs(testedDialect)
        .then(await delay(500))
        // click to connect
        .then(await btn.click())
        .then(await delay(1000));
        const testClass = await getClassOf(btn);
        expect(testClass).to.contain(expectedClass);

    });

    it('should show the database selector after connection',
    async () => {

        const expectedClass = 'test-connected';
        const databaseDropdown = this.getDatabaseDropdown();

        const testClass = await getClassOf(databaseDropdown);
        expect(testClass).to.contain(expectedClass);

    });

    it('should show a log with one logged item in the log',
    async () => {

        const expectedClass = 'test-1-entries';
        const logs = await this.getLogs();

        const testClass = await getClassOf(logs);
        expect(testClass).to.contain(expectedClass);

    });

    it('should not show a table preview',
    async () => {

        expect(await this.getTables()).to.throw(/NoSuchElementError/);

    });

    it('should show table previews when database is selected from dropdown',
    async () => {

        // TODO: debug how to get options from react-select
        // TODO: debug how to set a value into the react-select item
        const databaseDropdown = await this.getDatabaseDropdown();
        await databaseDropdown.click();

        expect(await this.getDatabaseOptions().getAttribute('value')).to.equal('[]');

    });

    it('should disconnect when the disconnect button is pressed',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.DISCONNECTED}`;
        const btn = await this.getConnectBtn();

        await btn.click()
        .then(await delay(1000));
        const testClass = await getClassOf(btn);
        expect(testClass).to.contain(expectedClass);

    });

    it('should display an error when wrong credentials are enetered and the ' +
    'button state should be disconnected and the log should not update',
    async () => {

        const expectedClass = `test-${APP_STATUS_CONSTANTS.ERROR}`;
        const testedDialect = ENGINES.MYSQL;
        const btn = await this.getConnectBtn();

        this.wrongInputs(testedDialect)
        .then(await delay(500))
        // click to connect
        .then(await btn.click())
        .then(await delay(1000));

        const errorMessage = await this.getErrorMessage();
        const testClass = await getClassOf(btn);
        expect(testClass.includes(expectedClass)).to.equal(true);
        expect(await errorMessage.getText()).to.have.length.above(0);

    });

    after(async () => {
        await this.driver.quit();
    });

});
