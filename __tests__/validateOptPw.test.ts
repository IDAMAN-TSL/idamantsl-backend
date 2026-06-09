jest.mock("../db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { validateOptionalPassword } from "../src/controllers/user.controller";

describe("validateOptionalPassword", () => {
  it("return null jika password tidak diisi karena password bersifat opsional", () => {
    expect(validateOptionalPassword(undefined)).toBeNull();
    expect(validateOptionalPassword(null)).toBeNull();
    expect(validateOptionalPassword("")).toBeNull();
  });

  it("return error 400 jika password kurang dari 8 karakter", () => {
    const result = validateOptionalPassword("abc123");

    expect(result).toEqual({
      error: "Password minimal 8 karakter",
      status: 400,
    });
  });

  it("return null jika password valid minimal 8 karakter", () => {
    const result = validateOptionalPassword("password123");

    expect(result).toBeNull();
  });
});
