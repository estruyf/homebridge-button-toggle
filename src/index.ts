import persist from "node-persist";
import { ButtonConfig, Homebridge, RegisteredButton } from "./models";
import HAPNodeJS from "hap-nodejs";
import { Logger } from "./helpers";
const packageJSON = require("../package.json");

const HOMEBRIDGE_PLUGIN_NAME = "homebridge-button-toggle";
const HOMEBRIDGE_PLATFORM_NAME = "button-toggle";

let Service: HAPNodeJS.Service;
let Characteristic: HAPNodeJS.Characteristic;
let HomebridgeAPI: any;

// Global logger
Logger.setPrefix(HOMEBRIDGE_PLUGIN_NAME);

module.exports = (homebridge: Homebridge) => {
  console.log(
    `The ${HOMEBRIDGE_PLUGIN_NAME} plugin version is: ${packageJSON.version}. Installed on Homebridge version: ${homebridge.version}.`
  );
  // Service and Characteristic are from hap-nodejs
  HomebridgeAPI = homebridge;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory(
    HOMEBRIDGE_PLUGIN_NAME,
    HOMEBRIDGE_PLATFORM_NAME,
    ButtonToggle
  );
};

class ButtonToggle {
  private name: string;
  private service: HAPNodeJS.Service;
  private state: boolean;
  private storageDirectory: any;
  private static log: any;
  private static storage: typeof persist;
  private static registeredButtons: RegisteredButton[] = [];

  constructor(private log: any, private config: ButtonConfig) {
    this.name = this.config.name;
    if (this.config.debug) {
      this.log("Homebridge", HomebridgeAPI);
    }

    if (this.config.type === "blinds") {
      this.service = new Service.WindowCovering(this.name, this.config.type);
    } else {
      this.service = new Service.Switch(this.name, this.config.type);
    }

    if (this.config.debug) {
      this.log("Service", this.service);
    }
    this.init();
  }

  /**
   * Initialize the button
   */
  private async init() {
    this.state = false;
    this.storageDirectory = HomebridgeAPI.user.persistPath();
    ButtonToggle.storage = persist;
    await ButtonToggle.storage.init({
      dir: this.storageDirectory,
      forgiveParseErrors: true,
    });

    // Set a listener to the set event state
    if (this.service.subtype === "blinds") {
      this.service
        .getCharacteristic(Characteristic.TargetPosition)
        .on("set", this.setState);
    } else {
      this.service
        .getCharacteristic(Characteristic.On)
        .on("set", this.setState);
    }

    // Add the button to the registered devices
    ButtonToggle.registeredButtons.push({
      name: this.config.name,
      dependsOn: this.config.dependsOn || [],
      dependsOff: this.config.dependsOff || [],
      update: this.autoUpdate,
    });

    const storedState = await ButtonToggle.storage.getItem(this.name);
    if (storedState) {
      setTimeout(() => {
        this.log(`Restoring persisted state: ${storedState}`);
        this.service.setCharacteristic(Characteristic.On, storedState);
      }, 250);
    }
  }

  /**
   * Default service retrieval method for Homebridge
   */
  public getServices() {
    const informationService = new (Service as any).AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Elio Struyf")
      .setCharacteristic(Characteristic.Model, "Toggle Button")
      .setCharacteristic(Characteristic.SerialNumber, "TBW01")
      .setCharacteristic(Characteristic.FirmwareRevision, packageJSON.version);
    return [informationService, this.service];
  }

  /**
   * Global trigger which gets called when a button changes its state
   */
  private static trigger = async (name: string, state: boolean) => {
    Logger.info(
      `[${name}]: Checking if there are other buttons which dependent on: ${name} for "${
        state ? "On" : "Off"
      }" state.`
    );

    // Retrieve all the button dependencies
    const btns = ButtonToggle.registeredButtons.filter((btn) =>
      state ? btn.dependsOn.includes(name) : btn.dependsOff.includes(name)
    );
    if (btns && btns.length > 0) {
      Logger.info(
        `[${name}]: Following button(s) have a dependency: ${btns
          .map((b) => b.name)
          .join(", ")}`
      );

      // Verify each button to see if its state needs to be updated
      for (const btn of btns) {
        const crntBtnState = await ButtonToggle.storage.getItem(btn.name);

        Logger.info(
          `[${name}]: The state of the dependency button (${btn.name}) is: ${crntBtnState}`
        );

        let depBtnStates: boolean[] = [];
        if (!crntBtnState && state) {
          // Retrieve the states of all buttons it depends on
          depBtnStates = await Promise.all(
            btn.dependsOn.map(
              async (name): Promise<boolean> =>
                await ButtonToggle.storage.getItem(name)
            )
          );
        } else if (crntBtnState && !state) {
          depBtnStates = await Promise.all(
            btn.dependsOff.map(
              async (name): Promise<boolean> =>
                await ButtonToggle.storage.getItem(name)
            )
          );
        }

        Logger.info(
          `[${name}]: Other dependency button states are: ${depBtnStates.join(
            ", "
          )}`
        );

        if (
          depBtnStates &&
          depBtnStates.length > 0 &&
          depBtnStates.filter((s) => s === !state).length === 0
        ) {
          Logger.info(`[${name}]: The button its state will be updated`);
          btn.update(state);
        }
      }
    } else {
      Logger.info(
        `[${name}]: Button didn't have any "${
          state ? "On" : "Off"
        }" dependencies`
      );
    }
  };

  /**
   * Automatic update when the dependent buttons are all active or inactive
   */
  private autoUpdate = (state: boolean) => {
    this.log(`Updating button state: ${state}`);
    this.setState(state, null);
    return;
  };

  /**
   * Update the state of a button
   */
  private setState = async (turnOn: boolean, callback: () => void) => {
    this.log(
      `New state: ${turnOn} - Previous state: ${
        this.state
      } - Callback: ${!!callback}`
    );

    if (turnOn && this.state) {
      this.log(`Switch is already ${this.state}, setting to ${!this.state}.`);
      setTimeout(() => {
        // setValue triggers another `set` event
        if (this.service.subtype === "blinds") {
          this.service
            .getCharacteristic(Characteristic.PositionState)
            .setValue(0);
        } else {
          this.service.getCharacteristic(Characteristic.On).setValue(false);
        }
      }, 250);
    } else {
      this.log(`Setting switch to ${turnOn}.`);
      this.state = turnOn;
      // updateValue doesn't trigger any other `set` event
      if (this.service.subtype === "blinds") {
        this.service
          .getCharacteristic(Characteristic.PositionState)
          .updateValue(100);
      } else {
        this.service.getCharacteristic(Characteristic.On).updateValue(turnOn);
      }
      await ButtonToggle.storage.setItem(this.name, turnOn);
      await ButtonToggle.trigger(this.name, turnOn);
    }

    if (callback) {
      callback();
    }
  };
}
