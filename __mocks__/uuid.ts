import * as crypto from "node:crypto";

export const v4 = () => {
  return crypto.randomUUID();
};
