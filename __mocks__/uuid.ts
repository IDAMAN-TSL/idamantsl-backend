import * as crypto from "crypto";

export const v4 = () => {
  return crypto.randomUUID();
};
