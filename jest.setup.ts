beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

jest.mock('./src/services/google-sheets.service', () => ({
  __esModule: true,
  appendLogToSheet: jest.fn().mockResolvedValue(true)
}));
