export interface ButtonConfig {
  /**
   * Required: Name of the button
   */
  name: string; 
  /**
   * Optional: Names of the buttons it depends on to automatically turn on when all of them are active.
   */
  dependsOn: string[]; 
  /**
   * Optional: Names of the buttons it depends on to automatically turn off when all of them are inactive.
   */
  dependsOff: string[];
  /**
   * Optional: Debug per button (turn off in production)
   */ 
  debug?: boolean;
}