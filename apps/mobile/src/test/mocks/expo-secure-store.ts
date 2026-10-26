const storage = new Map<string, string>();

export const isAvailableAsync = jest.fn(async () => true);

export const setItemAsync = jest.fn(async (key: string, value: string) => {
  storage.set(key, value);
});

export const getItemAsync = jest.fn(async (key: string) => {
  return storage.get(key) || null;
});

export const deleteItemAsync = jest.fn(async (key: string) => {
  storage.delete(key);
});
