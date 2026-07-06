// Sembunyikan console.error dan console.warn saat testing agar output terminal bersih
// Hal ini karena banyak test yang mensimulasikan error (seperti return 500) yang memang mencetak error ke console.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

// Mock service Google Sheets secara global agar tidak melakukan hit ke API saat testing
// dan mencegah error parsing dari library 'ky' (ESM)
jest.mock('./src/services/google-sheets.service', () => ({
  appendLogToSheet: jest.fn().mockResolvedValue(true)
}));
