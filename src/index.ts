import persist from 'node-persist';
import 'hap-nodejs';
import { Homebridge } from './models/Homebridge';
const packageJSON = require('../package.json');

const HOMEBRIDGE_PLUGIN_NAME = "homebridge-button-toggle";
const HOMEBRIDGE_PLATFORM_NAME = "button-toggle";

let Service: HAPNodeJS.Service;
let Characteristic: HAPNodeJS.Characteristic;
let HomebridgeAPI: any;

module.exports = (homebridge: Homebridge) => {
  console.log(`The ${HOMEBRIDGE_PLUGIN_NAME} plugin version is: ${packageJSON.version}. Installed on Homebridge version: ${homebridge.version}.`);
  // Service and Characteristic are from hap-nodejs
  HomebridgeAPI = homebridge;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  homebridge.registerAccessory(HOMEBRIDGE_PLUGIN_NAME, HOMEBRIDGE_PLATFORM_NAME, ToggleSwitch);
}

class ToggleSwitch {
  private name: string;
  private service: HAPNodeJS.Service;
  private state: boolean;
  private storageDirectory: any;
  private storage: typeof persist;

  constructor(private log: any, private config: { name: string; }) {
    this.name = this.config.name;
    this.service = new Service.Switch(this.name, null);
    this.init();
  }

  public getServices() {
    const informationService = new (Service as any).AccessoryInformation();
    informationService.setCharacteristic(Characteristic.Manufacturer, 'Elio Struyf')
                      .setCharacteristic(Characteristic.Model, 'Toggle Button')
                      .setCharacteristic(Characteristic.SerialNumber, 'TBW01')
                      .setCharacteristic(Characteristic.FirmwareRevision, packageJSON.version);
    return [informationService, this.service];
  }  

  private async init() {
    this.state = false;
    this.storageDirectory = HomebridgeAPI.user.persistPath();
    this.storage = persist;
    await this.storage.init({
      dir: this.storageDirectory,
      forgiveParseErrors: true
    });
    
    this.service.getCharacteristic(Characteristic.On).on('set', this.setState);

    const storedState = await this.storage.getItem(this.name);
    if (storedState) {
      setTimeout(() => {
        this.log(`Restoring persisted state: ${this.getStringFromState(storedState)}`);
        this.service.setCharacteristic(Characteristic.On, (!!storedState).toString());
      }, 250);
    }
  }

  private getStringFromState(state) {
    return state ? 'ON' : 'OFF';
  }

  private setState = async (turnOn: boolean, callback: () => void) => {
    if (turnOn && this.state) {
      this.log('Switch is ON, setting to OFF.');
      setTimeout(() => {
        this.service.setCharacteristic(Characteristic.On, "false");
      }, 100);
    } else {
      this.log(`Setting switch to ${this.getStringFromState(turnOn)}.`);
      this.state = turnOn;
      await this.storage.setItem(this.name, turnOn);
    }
    callback();
  }
}



