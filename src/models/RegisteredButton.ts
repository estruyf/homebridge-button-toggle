export interface RegisteredButton {
  name: string;
  dependsOn: string[];
  dependsOff: string[];
  update: (state: boolean) => void;
}