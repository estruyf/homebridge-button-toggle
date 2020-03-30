import chalk from 'chalk';
import util from 'util';

export enum LogLevel {
  debug = "debug",
  info = "info",
  warn = "warn",
  error = "error"
}

export class Logger {
  private static debugEnabled: boolean = false;
  private static timestampEnabled: boolean = true;
  private static prefix: string = "";

  /**
   * Specify if you want to enable or disable the debug logging
   * 
   * @param enabled 
   */
  public static setDebugLevel(enabled: boolean) {
    this.debugEnabled = enabled;
  }

  /**
   * Specify if you want to enable or disable the timestamp logging
   * 
   * @param enabled 
   */
  public static setTimestamp(enabled: boolean) {
    this.timestampEnabled = enabled;
  }

  /**
   * Set the prefix
   * 
   * @param enabled 
   */
  public static setPrefix(prefix: string) {
    this.prefix = prefix;
  }
  
  /**
   * Logging levels
   * @param msg 
   */
  public static debug(msg: string) {
    if (this.debugEnabled) {
      this.logger.apply(this, [LogLevel.debug].concat(Array.prototype.slice.call(arguments)));
    }
  }

  public static info(msg: string) {
    this.logger.apply(this, [LogLevel.info].concat(Array.prototype.slice.call(arguments)));
  }
  
  public static warn(msg: string) {
    this.logger.apply(this, [LogLevel.warn].concat(Array.prototype.slice.call(arguments)));
  }
  
  public static error(msg: string) {
    this.logger.apply(this, [LogLevel.error].concat(Array.prototype.slice.call(arguments)));
  }

  private static logger(level: LogLevel, msg: string) {
    msg = util.format.apply(util, Array.prototype.slice.call(arguments, 1));
    let func = console.log;
  
    if (level === LogLevel.debug) {
      msg = chalk.gray(msg);
    } else if (level === LogLevel.warn) {
      msg = chalk.yellow(msg);
      func = console.error;
    } else if (level === LogLevel.error) {
      msg = chalk.bold.red(msg);
      func = console.error;
    }
  
    // prepend prefix if applicable
    if (this.prefix) {
      msg = `${chalk.cyan(`[${this.prefix}]`)} ${msg}`
    }
  
    // prepend timestamp
    if (this.timestampEnabled) {
      const date = new Date();
      msg = `${chalk.white(`[${date.toLocaleString()}]`)} ${msg}`;
    }
  
    func(msg);
  }
}
