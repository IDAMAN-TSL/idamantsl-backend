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
  it("TC-WBT-01 - memvalidasi password undefined", () => {
    expect(validateOptionalPassword(undefined)).toBeNull();
  });

  it("TC-WBT-02 - memvalidasi password null", () => {
    expect(validateOptionalPassword(null)).toBeNull();
  });

  it("TC-WBT-03 - memvalidasi password string kosong", () => {
    expect(validateOptionalPassword("")).toBeNull();
  });

  it("TC-WBT-04 - memvalidasi password dengan tipe data bukan string", () => {
    const result = validateOptionalPassword(12345);

    expect(result).toEqual({
      error: "Password minimal 8 karakter",
      status: 400,
    });
  });

  it("TC-WBT-05 - memvalidasi password string dengan panjang kurang dari 8 karakter", () => {
    const result = validateOptionalPassword("abc123");

    expect(result).toEqual({
      error: "Password minimal 8 karakter",
      status: 400,
    });
  });

  it("TC-WBT-06 - memvalidasi password yang valid", () => {
    const result = validateOptionalPassword("password123");

    expect(result).toBeNull();
  });
});
